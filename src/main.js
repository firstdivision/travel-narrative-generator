import "./styles.css";
import { marked } from "marked";
import DOMPurify from "dompurify";

const app = document.querySelector("#app");

marked.setOptions({
  gfm: true,
  breaks: true,
});

async function renderJournal() {
  app.innerHTML = `
    <main class="page-shell">
      <header class="journal-header">
        <p class="kicker">Field Notes</p>
        <h1>Travel Journal</h1>
        <p class="subtitle">Rendered live from source markdown</p>
      </header>
      <article class="journal-card" aria-live="polite">
        <p class="status">Loading journal entry...</p>
      </article>
    </main>
  `;

  const card = document.querySelector(".journal-card");

  try {
    const response = await fetch("/travel/narrative.md", { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`Failed to load markdown (${response.status})`);
    }

    const markdown = await response.text();
    const html = marked.parse(markdown);
    const safeHtml = DOMPurify.sanitize(html);

    card.innerHTML = `<div class="journal-content">${safeHtml}</div>`;
  } catch (error) {
    card.innerHTML = `
      <p class="status error">Unable to load the travel narrative.</p>
      <p class="error-detail">${error.message}</p>
    `;
  }
}

renderJournal();