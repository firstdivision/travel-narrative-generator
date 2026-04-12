import "./styles.css";
import { marked } from "marked";
import DOMPurify from "dompurify";

const app = document.querySelector("#app");

marked.setOptions({
  gfm: true,
  breaks: true,
});

function slugifyHeading(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function buildJumpMenu(select, container) {
  const headings = Array.from(container.querySelectorAll("h1, h2, h3"));

  if (!headings.length) {
    select.innerHTML = '<option value="">No sections available</option>';
    select.disabled = true;
    return;
  }

  const usedIds = new Map();

  headings.forEach((heading) => {
    const baseId = slugifyHeading(heading.textContent || "section") || "section";
    const nextCount = (usedIds.get(baseId) || 0) + 1;
    usedIds.set(baseId, nextCount);
    heading.id = nextCount === 1 ? baseId : `${baseId}-${nextCount}`;
  });

  const options = headings
    .map((heading) => {
      const level = Number.parseInt(heading.tagName.slice(1), 10);
      const prefix = level > 1 ? `${"- ".repeat(level - 1)}` : "";
      return `<option value="${heading.id}">${prefix}${heading.textContent}</option>`;
    })
    .join("");

  select.innerHTML = `
    <option value="">Jump to section</option>
    ${options}
  `;
  select.disabled = false;
}

async function renderJournal() {
  app.innerHTML = `
    <main class="page-shell">
      <section class="hero-panel" aria-label="Travel journal overview">
        <div class="hero-copy">
          <p class="kicker">Southeast Asia Field Journal</p>
          <p class="subtitle">
            A quieter, more editorial reading experience for long-form writing across
            Malaysia, Thailand, Cambodia, and Vietnam.
          </p>
        </div>
        <div class="hero-actions">
          <label class="jump-label" for="section-jump">Jump to section</label>
          <select id="section-jump" class="jump-select" disabled>
            <option value="">Loading sections...</option>
          </select>
        </div>
      </section>

      <section class="content-layout">
        <article class="journal-card" aria-live="polite">
          <p class="status">Loading journal entry...</p>
        </article>
      </section>
    </main>
  `;

  const card = document.querySelector(".journal-card");
  const jumpSelect = document.querySelector("#section-jump");

  jumpSelect.addEventListener("change", (event) => {
    const targetId = event.target.value;
    if (!targetId) {
      return;
    }

    const targetHeading = document.getElementById(targetId);
    if (targetHeading) {
      targetHeading.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  try {
    const response = await fetch("/travel/narrative.md", { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`Failed to load markdown (${response.status})`);
    }

    const markdown = await response.text();
    const html = marked.parse(markdown);
    const safeHtml = DOMPurify.sanitize(html);

    card.innerHTML = `<div class="journal-content">${safeHtml}</div>`;
    buildJumpMenu(jumpSelect, card);
  } catch (error) {
    jumpSelect.innerHTML = '<option value="">Sections unavailable</option>';
    card.innerHTML = `
      <p class="status error">Unable to load the travel narrative.</p>
      <p class="error-detail">${error.message}</p>
    `;
  }
}

renderJournal();