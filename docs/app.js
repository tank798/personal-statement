const API_STORAGE_KEY = "statementMarginApiBase";

function normalizeApiBase(value) {
  if (!value) return "";
  return value.trim().replace(/\/+$/, "");
}

function resolveApiBase() {
  const params = new URLSearchParams(window.location.search);
  const queryValue = normalizeApiBase(params.get("api"));

  if (queryValue) {
    window.localStorage.setItem(API_STORAGE_KEY, queryValue);
    return queryValue;
  }

  const storedValue = normalizeApiBase(window.localStorage.getItem(API_STORAGE_KEY));
  if (storedValue) {
    return storedValue;
  }

  return window.location.hostname.endsWith("github.io") ? "http://127.0.0.1:3000" : "";
}

const apiBase = resolveApiBase();
const healthUrl = `${apiBase}/api/health`;
const reviewUrl = `${apiBase}/api/review`;

const uploadView = document.getElementById("upload-view");
const reviewView = document.getElementById("review-view");
const reviewForm = document.getElementById("review-form");
const draftInput = document.getElementById("draft-input");
const dropzone = document.getElementById("dropzone");
const selectedFileName = document.getElementById("selected-file-name");
const submitButton = document.getElementById("submit-button");
const engineStatus = document.getElementById("engine-status");
const templateStatus = document.getElementById("template-status");
const modelStatus = document.getElementById("model-status");
const statusNote = document.getElementById("status-note");
const manuscript = document.getElementById("manuscript");
const commentsList = document.getElementById("comments-list");
const manuscriptSectionTemplate = document.getElementById("manuscript-section-template");
const commentCardTemplate = document.getElementById("comment-card-template");

let currentFile = null;

function setView(view) {
  document.body.dataset.view = view;
  uploadView.hidden = view !== "upload";
  reviewView.hidden = view !== "review";
  window.scrollTo(0, 0);
}

function connectionHint() {
  return apiBase || window.location.origin;
}

function syncDropzoneState() {
  dropzone.classList.toggle("has-file", Boolean(currentFile));
}

function setCurrentFile(file) {
  currentFile = file;
  selectedFileName.textContent = file.name;
  submitButton.disabled = false;
  syncDropzoneState();
  clearInlineError();
}

function setLoadingState(isLoading) {
  submitButton.disabled = isLoading || !currentFile;
  submitButton.textContent = isLoading ? "处理中" : "批注";
  dropzone.classList.toggle("is-loading", isLoading);
}

function clearInlineError() {
  document.querySelector(".error-banner")?.remove();
}

function showInlineError(message) {
  clearInlineError();
  const banner = document.createElement("div");
  banner.className = "error-banner";
  banner.textContent = message;
  reviewForm.appendChild(banner);
}

function activateSection(sectionId) {
  manuscript.querySelectorAll(".manuscript-section").forEach((node) => {
    node.classList.toggle("active", node.dataset.sectionId === sectionId);
  });

  commentsList.querySelectorAll(".comment-card").forEach((node) => {
    node.classList.toggle("active", node.dataset.sectionId === sectionId);
  });

  manuscript.querySelector(`[data-section-id="${sectionId}"]`)?.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}

function renderReview(payload) {
  manuscript.innerHTML = "";
  commentsList.innerHTML = "";

  const sections = payload?.review?.sections || [];
  if (!sections.length) {
    throw new Error("AI 没有返回可展示的批注结果。");
  }

  sections.forEach((section) => {
    const sectionFragment = manuscriptSectionTemplate.content.cloneNode(true);
    const sectionNode = sectionFragment.querySelector(".manuscript-section");
    const redlineNode = sectionFragment.querySelector(".section-redline");

    sectionNode.dataset.sectionId = section.id;
    redlineNode.innerHTML = section.redlineHtml;
    sectionNode.addEventListener("click", () => activateSection(section.id));
    manuscript.appendChild(sectionFragment);

    const commentFragment = commentCardTemplate.content.cloneNode(true);
    const commentNode = commentFragment.querySelector(".comment-card");
    commentNode.dataset.sectionId = section.id;
    commentFragment.querySelector(".comment-title").textContent = section.comment.title;
    commentFragment.querySelector(".comment-body").textContent = section.comment.body;
    commentNode.addEventListener("click", () => activateSection(section.id));
    commentsList.appendChild(commentFragment);
  });

  setView("review");
  activateSection(sections[0].id);
}

async function fetchHealth() {
  try {
    const response = await fetch(healthUrl);
    if (!response.ok) {
      throw new Error("Health check failed.");
    }

    const health = await response.json();
    engineStatus.textContent = health.openaiConfigured ? "Live API" : "Mock fallback";
    templateStatus.textContent = `${health.templateCount} style file(s)`;
    modelStatus.textContent = health.openaiConfigured ? health.configuredModel : "local mock";
    statusNote.textContent = health.warnings.length ? health.warnings.join(" ") : "ready";
    clearInlineError();
  } catch {
    engineStatus.textContent = "Offline";
    templateStatus.textContent = "Templates unknown";
    modelStatus.textContent = "Model unavailable";
    statusNote.textContent = "backend unavailable";
    showInlineError(`没有连上 AI 接口。先启动本地服务 ${connectionHint()}，或者用 ?api=https://你的接口域名 指向线上 API。`);
  }
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
      body: formData,
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Review failed.");
    }

    renderReview(payload);
  } catch (error) {
    showInlineError(error.message || `生成失败。请检查接口 ${connectionHint()} 是否可用。`);
  } finally {
    setLoadingState(false);
  }
});

draftInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) {
    setCurrentFile(file);
  }
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

fetchHealth();
syncDropzoneState();