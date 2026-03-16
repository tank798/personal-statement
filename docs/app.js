const uploadView = document.getElementById("upload-view");
const reviewView = document.getElementById("review-view");
const fileInput = document.getElementById("file-input");
const dropzone = document.getElementById("dropzone");
const selectedFile = document.getElementById("selected-file");
const selectedName = document.getElementById("selected-name");
const confirmButton = document.getElementById("confirm-button");
const backButton = document.getElementById("back-button");
const exportButton = document.getElementById("export-button");
const reviewTitle = document.getElementById("review-title");
const paper = document.getElementById("paper");
const commentsList = document.getElementById("comments-list");
const commentCount = document.getElementById("comment-count");
const paragraphTemplate = document.getElementById("paragraph-template");
const commentTemplate = document.getElementById("comment-template");

let selected = null;

const demoReview = {
  paragraphs: [
    {
      id: "p1",
      label: "Opening Motivation",
      index: "01",
      html:
        "During my undergraduate study, I became interested in how data systems shape policy decisions, but the original draft stayed a little too broad here. In the revised version, the opening now lands faster on <span class=\"redline\" data-target=\"c1\">one concrete turning point in your coursework</span><span class=\"comment-marker\">1</span>, so the motivation feels earned rather than announced.",
    },
    {
      id: "p2",
      label: "Experience Framing",
      index: "02",
      html:
        "Your internship material is strong; it just needed cleaner sequencing. I tightened the transition so the paragraph moves from <span class=\"redline\" data-target=\"c2\">what you worked on</span><span class=\"comment-marker\">2</span> to <span class=\"redline\" data-target=\"c3\">what that experience taught you about the program you want next</span><span class=\"comment-marker\">3</span> without sounding like a resume list.",
    },
    {
      id: "p3",
      label: "Program Fit",
      index: "03",
      html:
        "The fit paragraph now stops praising the program in the abstract and instead explains why <span class=\"redline\" data-target=\"c4\">this specific training environment matches your next research step</span><span class=\"comment-marker\">4</span>. That shift usually makes the whole statement feel more mature immediately.",
    },
    {
      id: "p4",
      label: "Closing Direction",
      index: "04",
      html:
        "The ending has been compressed so it does not repeat the introduction. It now closes on <span class=\"redline\" data-target=\"c5\">a forward-looking question you want to keep working on</span><span class=\"comment-marker\">5</span>, which gives the essay a cleaner final note.",
    },
  ],
  comments: [
    {
      id: "c1",
      anchor: "1",
      title: "开头别飘着说兴趣",
      body: "这段原稿最大的问题不是没内容，而是动机太悬空。开头最好尽快落到一个具体触发点，不然读者会默认这是套话。",
      paragraphId: "p1",
    },
    {
      id: "c2",
      anchor: "2",
      title: "经历先讲动作",
      body: "这一段先把你到底做了什么说清楚，后面再谈感受和收获。原稿顺序有点反，所以读起来会虚。",
      paragraphId: "p2",
    },
    {
      id: "c3",
      anchor: "3",
      title: "经历和申请目标要接上",
      body: "这里建议把经历和下一步申请目标连起来，不然这段会停在“我做过这件事”，没有自然过渡到“所以我为什么要申请这个项目”。",
      paragraphId: "p2",
    },
    {
      id: "c4",
      anchor: "4",
      title: "fit 段要少夸多对接",
      body: "这一块通常最容易写成学校宣传稿。更稳的写法是：我现在缺什么，这个项目正好补什么。",
      paragraphId: "p3",
    },
    {
      id: "c5",
      anchor: "5",
      title: "结尾往前走，不要回头复述",
      body: "结尾再重复一遍初心没太大收益。收在一个更具体的未来方向上，会比“我一直很热爱”这种句子强很多。",
      paragraphId: "p4",
    },
  ],
};

function setSelectedFile(file) {
  selected = file;
  selectedName.textContent = file.name;
  selectedFile.hidden = false;
  confirmButton.disabled = false;
}

function renderReview() {
  paper.innerHTML = "";
  commentsList.innerHTML = "";
  reviewTitle.textContent = selected ? selected.name : "review.docx";
  commentCount.textContent = `${demoReview.comments.length} comments`;

  demoReview.paragraphs.forEach((paragraph) => {
    const fragment = paragraphTemplate.content.cloneNode(true);
    const section = fragment.querySelector(".paper-section");
    const label = fragment.querySelector(".section-headline");
    const index = fragment.querySelector(".section-index");
    const body = fragment.querySelector(".paper-paragraph");

    section.id = paragraph.id;
    label.textContent = paragraph.label;
    index.textContent = paragraph.index;
    body.innerHTML = paragraph.html;

    paper.appendChild(fragment);
  });

  demoReview.comments.forEach((comment) => {
    const fragment = commentTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".comment-card");
    card.dataset.commentId = comment.id;
    card.dataset.paragraphId = comment.paragraphId;

    fragment.querySelector(".comment-anchor").textContent = comment.anchor;
    fragment.querySelector(".comment-title").textContent = comment.title;
    fragment.querySelector(".comment-body").textContent = comment.body;

    card.addEventListener("click", () => activateComment(comment.id));
    commentsList.appendChild(fragment);
  });

  paper.querySelectorAll(".redline").forEach((highlight) => {
    highlight.addEventListener("click", () => activateComment(highlight.dataset.target));
  });
}

function activateComment(commentId) {
  const cards = commentsList.querySelectorAll(".comment-card");
  const highlights = paper.querySelectorAll(".redline");

  cards.forEach((card) => card.classList.toggle("active", card.dataset.commentId === commentId));
  highlights.forEach((highlight) => highlight.classList.toggle("active", highlight.dataset.target === commentId));

  const activeCard = commentsList.querySelector(`[data-comment-id="${commentId}"]`);
  const activeHighlight = paper.querySelector(`[data-target="${commentId}"]`);
  const paragraphId = activeCard?.dataset.paragraphId;
  const activeSection = paragraphId ? document.getElementById(paragraphId) : null;

  activeCard?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  activeSection?.scrollIntoView({ block: "center", behavior: "smooth" });
  activeHighlight?.focus?.();
}

function showReview() {
  uploadView.hidden = true;
  reviewView.hidden = false;
  renderReview();
  activateComment("c1");
}

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

confirmButton.addEventListener("click", showReview);

backButton.addEventListener("click", () => {
  reviewView.hidden = true;
  uploadView.hidden = false;
});

exportButton.addEventListener("click", () => {
  const text = demoReview.paragraphs
    .map((paragraph) => {
      const temp = document.createElement("div");
      temp.innerHTML = paragraph.html;
      return temp.textContent.trim();
    })
    .join("\n\n");

  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = (selected?.name || "revised-statement").replace(/\.[^.]+$/, "") + "-rewrite.txt";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
});
