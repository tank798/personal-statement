import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { extractTextFromUpload } from "./file-parsers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const templateDir = path.join(repoRoot, "templates");
const indexPath = path.join(repoRoot, "references", "template-index.md");
const principlesPath = path.join(repoRoot, "references", "editing-principles.md");
const supportedExtensions = new Set([".docx", ".pdf", ".txt", ".md"]);

function tokenize(value) {
  return new Set(
    (value.toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) || []).filter((token) => token.length > 1),
  );
}

function scoreIndexRow(draftText, row) {
  const draftTokens = tokenize(draftText);
  const rowTokens = tokenize(Object.values(row).join(" "));
  let score = 0;

  for (const token of rowTokens) {
    if (draftTokens.has(token)) {
      score += 1;
    }
  }

  if (row.use_case && draftText.toLowerCase().includes(row.use_case.toLowerCase())) {
    score += 2;
  }

  return score;
}

function parseMarkdownTable(markdown) {
  const lines = markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|"));

  if (lines.length < 3) {
    return [];
  }

  const headers = lines[0]
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());

  return lines.slice(2).map((line) => {
    const values = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());

    return headers.reduce((record, header, index) => {
      record[header] = values[index] || "";
      return record;
    }, {});
  });
}

async function loadTextFile(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

export async function loadEditingPrinciples() {
  return loadTextFile(principlesPath);
}

export async function loadTemplateIndexRows() {
  const markdown = await loadTextFile(indexPath);
  return parseMarkdownTable(markdown);
}

export async function discoverTemplateFiles() {
  try {
    const entries = await fs.readdir(templateDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => supportedExtensions.has(path.extname(name).toLowerCase()))
      .map((name) => ({
        fileName: name,
        filePath: path.join(templateDir, name),
      }));
  } catch {
    return [];
  }
}

async function loadTemplateText(absolutePath, relativePath) {
  const buffer = await fs.readFile(absolutePath);
  const parsed = await extractTextFromUpload(buffer, relativePath);
  return parsed.text;
}

export async function selectTemplatesForDraft(draftText, limit = Number(process.env.MAX_TEMPLATE_COUNT || 3)) {
  const rows = await loadTemplateIndexRows();
  const fileFallback = await discoverTemplateFiles();
  const warnings = [];

  if (!rows.length && !fileFallback.length) {
    return { templates: [], warnings: ["No approved templates found in the local templates directory."] };
  }

  const scoredRows = rows
    .map((row) => ({ ...row, _score: scoreIndexRow(draftText, row) }))
    .sort((left, right) => right._score - left._score || left.template_id.localeCompare(right.template_id))
    .slice(0, limit);

  const selected = [];

  for (const row of scoredRows) {
    const relativePath = row.file_path || "";
    const absolutePath = path.join(repoRoot, relativePath);

    try {
      const text = await loadTemplateText(absolutePath, relativePath);
      if (!text) {
        warnings.push(`Template ${relativePath} was found but extracted as empty text.`);
        continue;
      }

      selected.push({
        templateId: row.template_id || path.basename(relativePath),
        filePath: relativePath,
        reasonHint: row.best_for || row.notes || row.tone_tags || "",
        excerpt: text.slice(0, 3500),
      });
    } catch {
      warnings.push(`Template ${relativePath} could not be loaded.`);
    }
  }

  if (selected.length) {
    return { templates: selected, warnings };
  }

  for (const file of fileFallback.slice(0, limit)) {
    try {
      const text = await loadTemplateText(file.filePath, file.fileName);
      selected.push({
        templateId: path.parse(file.fileName).name,
        filePath: path.join("templates", file.fileName),
        reasonHint: "Fallback file without template index metadata.",
        excerpt: text.slice(0, 3500),
      });
    } catch {
      warnings.push(`Fallback template ${file.fileName} could not be loaded.`);
    }
  }

  return { templates: selected, warnings };
}

export async function getTemplateDiagnostics() {
  const rows = await loadTemplateIndexRows();
  const files = await discoverTemplateFiles();

  const warnings = [];
  if (!rows.length) {
    warnings.push("Template index is empty or missing. Add entries to references/template-index.md.");
  }
  if (!files.length) {
    warnings.push("No template files found under templates/.");
  }

  return {
    templateCount: files.length,
    indexedTemplateCount: rows.length,
    warnings,
  };
}