const healthUrl = "/api/health";
const reviewUrl = "/api/review";

const uploadView = document.getElementById("upload-view");
const reviewView = document.getElementById("review-view");
const reviewForm = document.getElementById("review-form");
const draftInput = document.getElementById("draft-input");
const dropzone = document.getElementById("dropzone");
const selectionCard = document.getElementById("selection-card");
const selectedFileName = document.getElementById("selected-file-name");
const submitButton = document.getElementById("submit-button");
const engineStatus = document.getElementById("engine-status");
const templateStatus = document.getElementById("template-status");
const modelStatus = document.getElementById("model-status");
const statusNote = document.getElementById("status-note");
const reviewFileTitle = document.getElementById("review-file-title");
const modePill = document.getElementById("mode-pill");
const templateTags = document.getElementById("template-tags");
const runNotes = document.getElementById("run-notes");
const manuscript = document.getElementById("manuscript");
const commentsList = document.getElementById("comments-list");
const commentTotal = document.getElementById("comment-total");
const newReviewButton = document.getElementById("new-review-button");
const downloadButton = document.getElementById("download-button");
const manuscriptSectionTemplate = document.getElementById("manuscript-section-template");
const commentCardTemplate = document.getElementById("comment-card-template");

let activeReview = null;
let currentFile = null;

async function fetchHealth() {
  try {
    const response = await fetch(healthUrl);
    if (!response.ok) throw new Error("Health check failed");
    const health = await response.json();
    engineStatus.textContent = health.openaiConfigured ? "OpenAI ready" : "Mock fallback";
    templateStatus.textContent = `${health.templateCount} file(s)`;
    modelStatus.textContent = health.openaiConfigured ? health.configuredModel : "local mock";
    statusNote.textContent = health.warnings.length
      ? health.warnings.join(" ")
      : "系统就绪。没有 API key 时，仍然可以用 mock 模式检查整条流程。";
  } catch {
    engineStatus.textContent = "Offline";
    templateStatus.textContent = "Unknown";
    modelStatus.textContent = "Unavailable";
    statusNote.textContent = "后端还没启动。先在 app/ 目录运行 npm install，再跑 npm run dev。";
  }
}

function setCurrentFile(file) {
  currentFile = file;
  selectedFileName.textContent = file.name;
  selectionCard.hidden = false;
  submitButton.disabled = false;
}

function setLoadingState(isLoading) {
  submitButton.disabled = isLoading || !currentFile;
  submitButton.textContent = isLoading ? "正在生成审阅结果..." : "开始审阅";
}

function clearInlineError() {
  document.querySelector(".error-banner")?.remove();
}

function showInlineError(message) {
  clearInlineError();
  const banner = document.createElement("div");
  banner.className = "error-banner";
  banner.textContent = message;
  uploadView.appendChild(banner);
}

function renderTemplateTags(referencedTemplates) {
  templateTags.innerHTML = "";
  if (!referencedTemplates.length) {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = "No local templates loaded";
    templateTags.appendChild(tag);
    return;
  }

  referencedTemplates.forEach((template) => {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = template.templateId;
    tag.title = `${template.filePath}\n${template.reason}`;
    templateTags.appendChild(tag);
  });
}

function renderRunNotes(notes) {
  runNotes.innerHTML = "";
  if (!notes.length) {
    const item = document.createElement("li");
    item.textContent = "No extra notes.";
    runNotes.appendChild(item);
    return;
  }

  notes.forEach((note) => {
    const item = document.createElement("li");
    item.textContent = note;
    runNotes.appendChild(item);
  });
}

function activateSection(sectionId) {
  manuscript.querySelectorAll(".manuscript-section").forEach((node) => {
    node.classList.toggle("active", node.dataset.sectionId === sectionId);
  });
  commentsList.querySelectorAll(".comment-card").forEach((node) => {
    node.classList.toggle("active", node.dataset.sectionId === sectionId);
  });

  const sectionNode = manuscript.querySelector(`[data-section-id="${sectionId}"]`);
  const commentNode = commentsList.querySelector(`[data-section-id="${sectionId}"]`);
  sectionNode?.scrollIntoView({ behavior: "smooth", block: "center" });
  commentNode?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function renderReview(payload) {
  activeReview = payload;
  reviewFileTitle.textContent = payload.draft.filename;
  modePill.textContent = payload.review.mode;
  commentTotal.textContent = `${payload.review.sections.length} comments`;

  renderTemplateTags(payload.review.referencedTemplates);
  renderRunNotes(payload.review.overallNotes);

  manuscript.innerHTML = "";
  commentsList.innerHTML = "";

  payload.review.sections.forEach((section, index) => {
    const sectionFragment = manuscriptSectionTemplate.content.cloneNode(true);
    const sectionNode = sectionFragment.querySelector(".manuscript-section");
    sectionNode.dataset.sectionId = section.id;
    sectionFragment.querySelector(".section-label").textContent = section.title;
    sectionFragment.querySelector(".section-id").textContent = `0${index + 1}`.slice(-2);
    sectionFragment.querySelector(".section-redline").innerHTML = section.redlineHtml;
    sectionNode.addEventListener("click", () => activateSection(section.id));
    manuscript.appendChild(sectionFragment);

    const commentFragment = commentCardTemplate.content.cloneNode(true);
    const commentNode = commentFragment.querySelector(".comment-card");
    commentNode.dataset.sectionId = section.id;
    commentFragment.querySelector(".comment-chip").textContent = `${index + 1}`;
    commentFragment.querySelector(".comment-title").textContent = section.comment.title;
    commentFragment.querySelector(".comment-body").textContent = section.comment.body;
    commentNode.addEventListener("click", () => activateSection(section.id));
    commentsList.appendChild(commentFragment);
  });

  uploadView.hidden = true;
  reviewView.hidden = false;
  activateSection(payload.review.sections[0]?.id);
}

reviewForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearInlineError();
  if (!currentFile) {
    showInlineError("先选一个文件。");
    return;
  }

  const formData = new FormData();
  formData.append("draft", currentFile);
  setLoadingState(true);

  try {
    const response = await fetch(reviewUrl, {
      method: "POST",
      body: formData
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Review failed.");
    renderReview(payload);
  } catch (error) {
    showInlineError(error.message || "生成审阅失败。");
  } finally {
    setLoadingState(false);
  }
});

draftInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) setCurrentFile(file);
});

["dragenter", "dragover"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.add("dragover");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.remove("dragover");
  });
});

dropzone.addEventListener("drop", (event) => {
  const [file] = event.dataTransfer.files;
  if (file) {
    draftInput.files = event.dataTransfer.files;
    setCurrentFile(file);
  }
});

newReviewButton.addEventListener("click", () => {
  reviewView.hidden = true;
  uploadView.hidden = false;
});

downloadButton.addEventListener("click", () => {
  if (!activeReview) return;
  const blob = new Blob([activeReview.review.revisedStatement], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = activeReview.draft.filename.replace(/\.[^.]+$/, "") + "-rewrite.txt";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
});

fetchHealth();