const root = document.documentElement;
const toggle = document.querySelector("[data-theme-toggle]");
const icon = document.querySelector("[data-theme-icon]");
const savedTheme = localStorage.getItem("theme");

if (savedTheme) {
  root.dataset.theme = savedTheme;
} else {
  root.dataset.theme = "dark";
}

function syncThemeLabel() {
  if (icon) {
    icon.textContent = root.dataset.theme === "dark" ? "LIGHT" : "DARK";
  }
}

syncThemeLabel();

toggle?.addEventListener("click", () => {
  const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
  root.dataset.theme = nextTheme;
  localStorage.setItem("theme", nextTheme);
  syncThemeLabel();
});

const year = document.querySelector("[data-year]");
if (year) {
  year.textContent = new Date().getFullYear().toString();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Cannot load ${path}`);
  }
  return response.json();
}

async function fetchText(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Cannot load ${path}`);
  }
  return response.text();
}

const board = document.querySelector("[data-pixel-board]");
const pixelColors = [
  "var(--pixel-1)",
  "var(--pixel-2)",
  "var(--pixel-3)",
  "var(--pixel-4)",
  "var(--pixel-5)",
  "var(--pixel-6)",
];

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function colorPixel(pixel) {
  pixel.style.backgroundColor = pixelColors[Math.floor(Math.random() * pixelColors.length)];
}

function clearPixel(pixel) {
  pixel.style.backgroundColor = "var(--panel-alt)";
}

function animatePixelBoard() {
  if (!board) {
    return;
  }

  if (!board.children.length) {
    for (let index = 0; index < 64; index += 1) {
      board.appendChild(document.createElement("span"));
    }
  }

  const pixels = Array.from(board.querySelectorAll("span"));
  const fillOrder = shuffle(pixels);
  const clearOrder = shuffle(pixels);
  const stepMs = 45;
  const holdMs = 650;

  fillOrder.forEach((pixel, index) => {
    window.setTimeout(() => colorPixel(pixel), index * stepMs);
  });

  const clearStart = fillOrder.length * stepMs + holdMs;
  clearOrder.forEach((pixel, index) => {
    window.setTimeout(() => clearPixel(pixel), clearStart + index * stepMs);
  });

  const loopAfter = clearStart + clearOrder.length * stepMs + holdMs;
  window.setTimeout(animatePixelBoard, loopAfter);
}

animatePixelBoard();

const aboutBody = document.querySelector("[data-about-body]");
const aboutTags = document.querySelector("[data-about-tags]");
const projectList = document.querySelector("[data-project-list]");
const linkList = document.querySelector("[data-link-list]");

async function loadAbout() {
  if (!aboutBody || !aboutTags) {
    return;
  }

  try {
    const about = await fetchJson("./context/about.json");
    aboutBody.textContent = about.body;
    aboutTags.innerHTML = (about.tags || []).map((tag) => `<li>${escapeHtml(tag)}</li>`).join("");
  } catch {
    aboutBody.textContent = "Profile content failed to load.";
  }
}

async function loadProjects() {
  if (!projectList) {
    return;
  }

  projectList.innerHTML = '<p class="empty-state">Loading projects...</p>';

  try {
    const files = await fetchJson("./context/project/manifest.json");
    const projects = await Promise.all(files.map((file) => fetchJson(`./context/project/${file}`)));
    projectList.innerHTML = projects
      .map((project) => {
        const action = project.url
          ? `<a href="${escapeHtml(project.url)}" target="_blank" rel="noreferrer">Link</a>`
          : '<span class="null-link">Null</span>';
        return `
          <article class="card">
            <h3>${escapeHtml(project.title)}</h3>
            <p>${escapeHtml(project.description)}</p>
            ${action}
          </article>
        `;
      })
      .join("");
  } catch {
    projectList.innerHTML = '<p class="empty-state">项目加载失败。请确认 context/project 文件夹存在。</p>';
  }
}

async function loadLinks() {
  if (!linkList) {
    return;
  }

  linkList.innerHTML = '<p class="empty-state">Loading links...</p>';

  try {
    const files = await fetchJson("./context/links/manifest.json");
    const links = await Promise.all(files.map((file) => fetchJson(`./context/links/${file}`)));
    linkList.innerHTML = links
      .map((link) => {
        const variant = link.variant === "primary" ? "primary" : "secondary";
        return `
          <a class="button ${variant}" href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.label)}</a>
          <p>${escapeHtml(link.description)}</p>
        `;
      })
      .join("");
  } catch {
    linkList.innerHTML = '<p class="empty-state">链接加载失败。请确认 context/links 文件夹存在。</p>';
  }
}

loadAbout();
loadProjects();
loadLinks();

const essayList = document.querySelector("[data-essay-list]");
const essaySearch = document.querySelector("[data-essay-search]");
const essaySubmit = document.querySelector("[data-essay-submit]");
const essayRefresh = document.querySelector("[data-essay-refresh]");
const essayPreview = document.querySelector("[data-essay-preview]");
const previewBody = document.querySelector("[data-preview-body]");
const previewClose = document.querySelector("[data-preview-close]");
const ESSAY_FILES = [
  "rain-at-terminal.md",
  "archive-of-wind.md",
  "small-observatory.md",
];
let essays = [];
let recommendedEssays = [];

function renderMarkdown(markdown) {
  const lines = markdown.split("\n");
  const blocks = [];
  let listItems = [];

  function flushList() {
    if (listItems.length) {
      blocks.push(`<ul>${listItems.map((item) => `<li>${item}</li>`).join("")}</ul>`);
      listItems = [];
    }
  }

  lines.forEach((line) => {
    const text = line.trim();

    if (!text) {
      flushList();
      return;
    }

    if (text.startsWith("- ")) {
      listItems.push(escapeHtml(text.slice(2)));
      return;
    }

    flushList();

    if (text.startsWith("# ")) {
      blocks.push(`<h1>${escapeHtml(text.slice(2))}</h1>`);
    } else if (text.startsWith("## ")) {
      blocks.push(`<h2>${escapeHtml(text.slice(3))}</h2>`);
    } else if (text.startsWith("### ")) {
      blocks.push(`<h3>${escapeHtml(text.slice(4))}</h3>`);
    } else {
      blocks.push(`<p>${escapeHtml(text)}</p>`);
    }
  });

  flushList();
  return blocks.join("");
}

function parseEssayFile(file, markdown) {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const meta = {};
  let body = normalized;

  if (match) {
    match[1].split("\n").forEach((line) => {
      const separator = line.indexOf(":");
      if (separator === -1) {
        return;
      }

      const key = line.slice(0, separator).trim();
      const value = line.slice(separator + 1).trim();
      meta[key] = value;
    });
    body = match[2].trim();
  }

  const fallbackTitle = file.replace(/\.md$/i, "").replaceAll("-", " ");
  return {
    id: file.replace(/\.md$/i, ""),
    file,
    title: meta.title || fallbackTitle,
    date: meta.date || "",
    summary: meta.summary || "",
    body,
  };
}

async function loadEssayMarkdown(essay) {
  if (essay.body) {
    return essay.body;
  }

  const markdown = await fetchText(`./essays/${essay.file}`);
  const parsed = parseEssayFile(essay.file, markdown);
  Object.assign(essay, parsed);
  return essay.body;
}

async function openEssayPreview(essay) {
  if (!essayPreview || !previewBody) {
    return;
  }

  previewBody.innerHTML = "<p>Loading...</p>";
  essayPreview.hidden = false;
  previewClose?.focus();

  try {
    const markdown = await loadEssayMarkdown(essay);
    previewBody.innerHTML = renderMarkdown(markdown);
  } catch {
    previewBody.innerHTML = "<p>文章加载失败。请确认 essays 文件夹中的 Markdown 文件存在。</p>";
  }
}

function closeEssayPreview() {
  if (essayPreview) {
    essayPreview.hidden = true;
  }
}

function pickRecommendedEssays() {
  recommendedEssays = shuffle(essays).slice(0, 2);
}

function queryEssays(query) {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return recommendedEssays;
  }

  return essays.filter((essay) => {
    const haystack = [essay.title, essay.date, essay.summary].join(" ").toLowerCase();
    return haystack.includes(needle);
  });
}

function renderEssays(filter = "") {
  if (!essayList) {
    return;
  }

  const filtered = queryEssays(filter);
  essayList.innerHTML = "";

  filtered.forEach((essay) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "essay-card";
    button.innerHTML = `
      <div class="essay-meta">
        <span>${escapeHtml(essay.date)}</span>
        <span>${escapeHtml(essay.id)}</span>
      </div>
      <h3>${escapeHtml(essay.title)}</h3>
      <p>${escapeHtml(essay.summary)}</p>
    `;
    button.addEventListener("click", () => openEssayPreview(essay));
    essayList.appendChild(button);
  });

  if (!filtered.length) {
    essayList.innerHTML = '<p class="empty-state">没有找到匹配文章。</p>';
  }
}

function runEssaySearch() {
  renderEssays(essaySearch?.value || "");
}

async function loadEssays() {
  if (!essayList) {
    return;
  }

  essayList.innerHTML = '<p class="empty-state">Loading essays...</p>';

  try {
    const loadedEssays = await Promise.all(
      ESSAY_FILES.map(async (file) => parseEssayFile(file, await fetchText(`./essays/${file}`))),
    );
    essays = loadedEssays;
    pickRecommendedEssays();
    renderEssays();
  } catch {
    essayList.innerHTML = '<p class="empty-state">随想加载失败。请通过本地服务器预览，或确认 essays 文件夹中的 Markdown 文件存在。</p>';
  }
}

loadEssays();

essaySearch?.addEventListener("input", runEssaySearch);
essaySearch?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    runEssaySearch();
  }
});
essaySubmit?.addEventListener("click", runEssaySearch);

essayRefresh?.addEventListener("click", () => {
  pickRecommendedEssays();
  if (essaySearch) {
    essaySearch.value = "";
  }
  renderEssays();
});

previewClose?.addEventListener("click", closeEssayPreview);
essayPreview?.addEventListener("click", (event) => {
  if (event.target === essayPreview) {
    closeEssayPreview();
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeEssayPreview();
  }
});
