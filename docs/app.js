const uploadView = document.getElementById("upload-view");
const reviewView = document.getElementById("review-view");
const reviewForm = document.getElementById("review-form");
const fileInput = document.getElementById("file-input");
const dropzone = document.getElementById("dropzone");
const selectedName = document.getElementById("selected-name");
const confirmButton = document.getElementById("confirm-button");
const paper = document.getElementById("paper");
const commentsList = document.getElementById("comments-list");
const paragraphTemplate = document.getElementById("paragraph-template");
const commentTemplate = document.getElementById("comment-template");

let selected = null;
let autoAdvanceTimer = null;

const demoReview = {
  paragraphs: [
    {
      id: "p1",
      html: "我……对……感兴趣。",
    },
    {
      id: "p2",
      html: "在我的 RA 工作期间，我<span class=\"redline-insert\">把数据清洗和政策问题联系起来</span>。",
    },
  ],
  comments: [
    {
      id: "c1",
      title: "开头可以更稳一点",
      body: "信息是够的，但第一句有点直给。我把语气压低一点，显得更像成熟申请文书。",
      paragraphId: "p1",
    },
    {
      id: "c2",
      title: "经历段补上因果链",
      body: "原文写了做了什么，但没说说这些事情怎么支撑申请方向，所以这里把逻辑链补齐了。",
      paragraphId: "p2",
    },
  ],
};

function setView(view) {
  document.body.dataset.view = view;
  uploadView.hidden = view !== "upload";
  reviewView.hidden = view !== "review";
  window.scrollTo(0, 0);
}

function activateComment(paragraphId) {
  paper.querySelectorAll(".manuscript-section").forEach((section) => {
    section.classList.toggle("active", section.dataset.paragraphId === paragraphId);
  });

  commentsList.querySelectorAll(".comment-card").forEach((card) => {
    card.classList.toggle("active", card.dataset.paragraphId === paragraphId);
  });
}

function renderReview() {
  paper.innerHTML = "";
  commentsList.innerHTML = "";

  demoReview.paragraphs.forEach((paragraph) => {
    const fragment = paragraphTemplate.content.cloneNode(true);
    const section = fragment.querySelector(".manuscript-section");
    const body = fragment.querySelector(".section-redline");

    section.dataset.paragraphId = paragraph.id;
    body.innerHTML = paragraph.html;
    section.addEventListener("click", () => activateComment(paragraph.id));
    paper.appendChild(fragment);
  });

  demoReview.comments.forEach((comment) => {
    const fragment = commentTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".comment-card");

    card.dataset.paragraphId = comment.paragraphId;
    fragment.querySelector(".comment-title").textContent = comment.title;
    fragment.querySelector(".comment-body").textContent = comment.body;
    card.addEventListener("click", () => activateComment(comment.paragraphId));
    commentsList.appendChild(fragment);
  });

  activateComment("p1");
}

function showReview() {
  if (!selected) return;
  setView("review");
  renderReview();
}

function queueAutoAdvance() {
  clearTimeout(autoAdvanceTimer);
  autoAdvanceTimer = setTimeout(() => {
    if (selected && document.body.dataset.view === "upload") {
      showReview();
    }
  }, 90);
}

function setSelectedFile(file) {
  selected = file;
  selectedName.textContent = file.name;
  confirmButton.disabled = false;
  dropzone.classList.add("has-file");
  queueAutoAdvance();
}

reviewForm.addEventListener("submit", (event) => {
  event.preventDefault();
  showReview();
});

fileInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) {
    setSelectedFile(file);
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
    fileInput.files = event.dataTransfer.files;
    setSelectedFile(file);
  }
});