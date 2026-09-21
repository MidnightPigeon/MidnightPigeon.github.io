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

const pricingDialog = document.querySelector("[data-pricing-dialog]");
document.querySelector("[data-pricing-close]")?.addEventListener("click", () => pricingDialog.close());
pricingDialog?.addEventListener("click", (event) => {
  const bounds = pricingDialog.getBoundingClientRect();
  if (event.target === pricingDialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) {
    pricingDialog.close();
  }
});

function bindPricingButtons(container, tasks) {
  container.querySelectorAll("[data-pricing]").forEach((button, index) => {
    button.addEventListener("click", () => {
      const task = tasks[index];
      pricingDialog.querySelector("#pricing-title").textContent = task.name;
      pricingDialog.querySelector("[data-pricing-rules]").innerHTML = task.rules.map((rule) => `<p>${escapeHtml(rule)}</p>`).join("");
      pricingDialog.showModal();
    });
  });
}

function pricingAction(task) {
  return `<span>${escapeHtml(task.price)}</span><button type="button" class="pricing-trigger" data-pricing aria-haspopup="dialog" aria-label="${escapeHtml(task.name)}：计费规则">计费规则</button>`;
}

async function loadServices() {
  const serviceList = document.querySelector("[data-service-list]");
  if (!serviceList) return;

  serviceList.textContent = "正在加载业务内容……";
  try {
    const [groups, special] = await Promise.all([
      fetchJson("./context/services.json"),
      fetchJson("./context/special-service.json"),
    ]);
    serviceList.innerHTML = `
      <table class="service-table" aria-labelledby="services-title">
        <colgroup><col class="service-category"><col><col class="service-price"></colgroup>
        <thead>
          <tr><td colspan="3">本人过往作品可前往Github，Bilibili与网易云音乐查询。</td></tr>
          <tr><th scope="col">板块</th><th scope="col">任务</th><th scope="col">报价</th></tr>
        </thead>
        ${groups.map((group) => `<tbody>${group.tasks.map((task, index) => `
          <tr>
            ${index === 0 ? `<th scope="rowgroup" rowspan="${group.tasks.length}">${escapeHtml(group.category)}</th>` : ""}
            <th scope="row">${escapeHtml(task.name)}</th>
            <td><div class="service-quote">${pricingAction(task)}</div></td>
          </tr>`).join("")}</tbody>`).join("")}
        <tbody>
          <tr>
            <th scope="row" colspan="2">${escapeHtml(special.name)}</th>
            <td><div class="service-quote">${pricingAction(special)}</div></td>
          </tr>
          <tr>
            <td colspan="3" class="service-contact">快捷联系方式: <a href="mailto:Midnight_Pigeon@outlook.com">Midnight_Pigeon@outlook.com</a> <span>（所有价格为暂定价）</span></td>
          </tr>
        </tbody>
      </table>`;
    bindPricingButtons(serviceList, [...groups.flatMap((group) => group.tasks), special]);
  } catch {
    serviceList.textContent = "业务内容加载失败，请稍后重试。";
  }
}

loadAbout();
loadServices();
loadProjects();
loadLinks();
