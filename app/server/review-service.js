import { diffWords } from "diff";
import OpenAI from "openai";

import {
  getTemplateDiagnostics,
  loadEditingPrinciples,
  selectTemplatesForDraft,
} from "./templates.js";

const openaiClient = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      ...(process.env.OPENAI_BASE_URL ? { baseURL: process.env.OPENAI_BASE_URL } : {}),
    })
  : null;

const responseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    feedback_language: { type: "string" },
    source_language: { type: "string" },
    referenced_templates: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          template_id: { type: "string" },
          file_path: { type: "string" },
          reason: { type: "string" }
        },
        required: ["template_id", "file_path", "reason"]
      }
    },
    sections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          revised_text: { type: "string" },
          comment_title: { type: "string" },
          comment_body: { type: "string" }
        },
        required: ["id", "title", "revised_text", "comment_title", "comment_body"]
      }
    },
    overall_notes: {
      type: "array",
      items: { type: "string" }
    }
  },
  required: ["feedback_language", "source_language", "referenced_templates", "sections", "overall_notes"]
};

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inferSectionTitle(index, total) {
  if (total === 1) return "Full Draft";
  if (index === 0) return "Opening Motivation";
  if (index === total - 1) return "Closing Direction";
  if (total >= 4 && index === total - 2) return "Program Fit";
  if (total >= 5 && index === 1) return "Background / Preparation";
  return `Core Experience ${index}`;
}

function splitIntoSections(text) {
  const paragraphs = text
    .split(/\n\s*\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const chunks = paragraphs.length ? paragraphs : [text.trim()];

  return chunks.map((originalText, index) => ({
    id: `section-${index + 1}`,
    title: inferSectionTitle(index, chunks.length),
    originalText
  }));
}

function buildRedlineHtml(originalText, revisedText) {
  const parts = diffWords(originalText, revisedText);
  return parts
    .map((part) => {
      const value = escapeHtml(part.value);
      if (part.added) return `<span class="redline-insert">${value}</span>`;
      if (part.removed) return `<span class="redline-delete">${value}</span>`;
      return value;
    })
    .join("");
}

function mergeReviewWithSections(sectionBlueprints, review) {
  const sectionsById = new Map(sectionBlueprints.map((section) => [section.id, section]));

  return review.sections.map((section, index) => {
    const original = sectionsById.get(section.id) || sectionBlueprints[index];
    const revisedText = section.revised_text.trim();

    return {
      id: original.id,
      title: section.title || original.title,
      originalText: original.originalText,
      revisedText,
      redlineHtml: buildRedlineHtml(original.originalText, revisedText),
      comment: {
        id: `comment-${index + 1}`,
        title: section.comment_title.trim(),
        body: section.comment_body.trim()
      }
    };
  });
}

function polishMockParagraph(text, index, total) {
  let revised = text
    .replace(/\bvery\s+/gi, "")
    .replace(/\bI think\b/gi, "I realized")
    .replace(/\bdeeply\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (index === 0 && !/[.!?]$/.test(revised)) revised += ".";
  if (index === total - 1 && !revised.includes("next")) {
    revised += " My next step is to turn this direction into focused graduate study.";
  }

  return revised;
}

function buildMockReview(sectionBlueprints, templateSelection, diagnostics, modeReason = null) {
  const sections = sectionBlueprints.map((section, index) => {
    const revisedText = polishMockParagraph(section.originalText, index, sectionBlueprints.length);
    return {
      ...section,
      revisedText,
      redlineHtml: buildRedlineHtml(section.originalText, revisedText),
      comment: {
        id: `comment-${index + 1}`,
        title:
          index === 0
            ? "开头先落具体动机"
            : index === sectionBlueprints.length - 1
              ? "结尾往下一步走"
              : "这一段逻辑可以更直一点",
        body:
          index === 0
            ? "这一段先把兴趣压到一个更具体的触发点上，会比泛泛地说热爱更可信。"
            : index === sectionBlueprints.length - 1
              ? "结尾别回头重复前面的话，直接收在你下一步想继续推进的问题上，会更稳。"
              : "这段素材本身够用，但动作、收获、申请目标三件事最好排成一个顺序，不然会有点散。"
      }
    };
  });

  const notes = [...templateSelection.warnings, ...diagnostics.warnings];
  if (!templateSelection.templates.length) {
    notes.unshift("No approved templates were loaded, so this run used only the house editing principles.");
  }
  if (modeReason) {
    notes.unshift(modeReason);
  }

  return {
    mode: modeReason ? "mock-fallback" : "mock",
    model: null,
    feedbackLanguage: "zh-CN",
    sourceLanguage: "auto",
    referencedTemplates: templateSelection.templates.map((template) => ({
      templateId: template.templateId,
      filePath: template.filePath,
      reason: template.reasonHint || "Loaded from local template library."
    })),
    sections,
    overallNotes: notes,
    revisedStatement: sections.map((section) => section.revisedText).join("\n\n")
  };
}

async function callOpenAIReview(sectionBlueprints, templateSelection, principlesText) {
  const model = process.env.OPENAI_MODEL || "gpt-5-mini";
  const prompt = [
    "You are an admissions essay editor reviewing a personal statement.",
    "Preserve facts. Improve wording, logic, transitions, and paragraph function.",
    "Write comment_title and comment_body in Simplified Chinese.",
    "The tone of comments should feel human, direct, and a little casual, not robotic.",
    "Keep revised_text in the original language of each source section.",
    "Do not merge, drop, or add sections. Return one revised paragraph per section.",
    "If a fact is missing, mark it inline as [To confirm: ...] instead of inventing details.",
    "Editing principles:",
    principlesText || "No additional editing principles were provided.",
    "Selected local templates:",
    JSON.stringify(
      templateSelection.templates.map((template) => ({
        template_id: template.templateId,
        file_path: template.filePath,
        reason_hint: template.reasonHint,
        excerpt: template.excerpt
      })),
      null,
      2
    ),
    "Sections to revise:",
    JSON.stringify(
      sectionBlueprints.map((section) => ({
        id: section.id,
        title: section.title,
        original_text: section.originalText
      })),
      null,
      2
    )
  ].join("\n\n");

  const response = await openaiClient.responses.create({
    model,
    input: prompt,
    max_output_tokens: 6000,
    text: {
      format: {
        type: "json_schema",
        name: "statement_review",
        strict: true,
        schema: responseSchema
      }
    }
  });

  const parsed = JSON.parse(response.output_text);
  return {
    mode: "openai",
    model,
    feedbackLanguage: parsed.feedback_language,
    sourceLanguage: parsed.source_language,
    referencedTemplates: parsed.referenced_templates.map((template) => ({
      templateId: template.template_id,
      filePath: template.file_path,
      reason: template.reason
    })),
    sections: mergeReviewWithSections(sectionBlueprints, parsed),
    overallNotes: [...templateSelection.warnings, ...parsed.overall_notes]
  };
}

export async function buildReviewPayload({ filename, text, parser }) {
  const sectionBlueprints = splitIntoSections(text);
  const templateSelection = await selectTemplatesForDraft(text);
  const principlesText = await loadEditingPrinciples();
  const diagnostics = await getTemplateDiagnostics();

  let review;

  if (!openaiClient) {
    review = buildMockReview(sectionBlueprints, templateSelection, diagnostics);
  } else {
    try {
      review = await callOpenAIReview(sectionBlueprints, templateSelection, principlesText);
      review.overallNotes = [...diagnostics.warnings, ...review.overallNotes];
      review.revisedStatement = review.sections.map((section) => section.revisedText).join("\n\n");
    } catch (error) {
      review = buildMockReview(
        sectionBlueprints,
        templateSelection,
        diagnostics,
        `OpenAI request failed, so this run fell back to local mock mode: ${error.message}`
      );
    }
  }

  return {
    draft: {
      filename,
      parser,
      originalText: text,
      sectionCount: sectionBlueprints.length
    },
    review
  };
}

export { getTemplateDiagnostics };