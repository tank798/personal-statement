import "dotenv/config";
import express from "express";
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { extractTextFromUpload } from "./file-parsers.js";
import { buildReviewPayload, getTemplateDiagnostics } from "./review-service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 3000);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

app.get("/api/health", async (_request, response) => {
  const diagnostics = await getTemplateDiagnostics();
  response.json({
    ok: true,
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    configuredModel: process.env.OPENAI_MODEL || "gpt-5-mini",
    templateCount: diagnostics.templateCount,
    indexedTemplateCount: diagnostics.indexedTemplateCount,
    warnings: diagnostics.warnings,
  });
});

app.post("/api/review", upload.single("draft"), async (request, response, next) => {
  try {
    if (!request.file) {
      response.status(400).json({ error: "Please upload one draft file." });
      return;
    }

    const draft = await extractTextFromUpload(request.file.buffer, request.file.originalname);

    if (!draft.text || draft.text.trim().length < 80) {
      response.status(400).json({
        error: "The extracted text is too short. Please upload a more complete statement draft.",
      });
      return;
    }

    const payload = await buildReviewPayload({
      filename: request.file.originalname,
      text: draft.text,
      parser: draft.parser,
    });

    response.json(payload);
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  const status = error.statusCode || error.status || 500;
  response.status(status).json({
    error: error.message || "Unexpected server error.",
  });
});

app.listen(port, () => {
  console.log(`Statement Margin app listening on http://localhost:${port}`);
});