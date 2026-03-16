import path from "node:path";

import mammoth from "mammoth";
import pdfParse from "pdf-parse";

function normalizeText(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractTextFromUpload(buffer, filename) {
  const extension = path.extname(filename).toLowerCase();

  if ([".txt", ".md"].includes(extension)) {
    return {
      parser: "plain-text",
      text: normalizeText(buffer.toString("utf8")),
    };
  }

  if (extension === ".docx") {
    const result = await mammoth.extractRawText({ buffer });
    return {
      parser: "mammoth",
      text: normalizeText(result.value),
    };
  }

  if (extension === ".pdf") {
    const result = await pdfParse(buffer);
    return {
      parser: "pdf-parse",
      text: normalizeText(result.text || ""),
    };
  }

  if (extension === ".doc") {
    const error = new Error("Legacy .doc files are not supported yet. Please re-save the file as .docx or export it as PDF.");
    error.statusCode = 400;
    throw error;
  }

  const error = new Error(`Unsupported file type: ${extension || "unknown"}. Use PDF, DOCX, TXT, or MD.`);
  error.statusCode = 400;
  throw error;
}