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
