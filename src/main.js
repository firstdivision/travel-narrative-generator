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

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function extractChapterFromMarkdown(markdown, fallbackTitle) {
  const tokens = marked.lexer(markdown);
  let documentTitle = null;
  let chapterTitle = null;
  const contentTokens = [];

  for (const token of tokens) {
    if (!documentTitle && token.type === "heading" && token.depth === 1) {
      documentTitle = token.text;
      continue;
    }

    if (!chapterTitle && token.type === "heading" && token.depth === 2) {
      chapterTitle = token.text;
      continue;
    }

    contentTokens.push(token);
  }

  return {
    documentTitle,
    chapterTitle: chapterTitle || fallbackTitle,
    contentTokens,
  };
}

async function loadChapterData() {
  const manifestResponse = await fetch("/travel/narrative/manifest.json", {
    cache: "no-cache",
  });

  if (!manifestResponse.ok) {
    throw new Error(`Failed to load manifest (${manifestResponse.status})`);
  }

  const manifest = await manifestResponse.json();
  const chapterEntries = Array.isArray(manifest.chapters) ? manifest.chapters : [];

  if (!chapterEntries.length) {
    throw new Error("No chapter files were found in the manifest.");
  }

  const usedSlugs = new Map();
  const chapters = [];
  let documentTitle = "Travel Journal";

  for (const [index, chapterEntry] of chapterEntries.entries()) {
    const chapterResponse = await fetch(chapterEntry.file, { cache: "no-cache" });

    if (!chapterResponse.ok) {
      throw new Error(`Failed to load chapter markdown (${chapterResponse.status})`);
    }

    const markdown = await chapterResponse.text();
    const fallbackTitle = chapterEntry.date || `Chapter ${index + 1}`;
    const chapter = extractChapterFromMarkdown(markdown, fallbackTitle);

    if (index === 0 && chapter.documentTitle) {
      documentTitle = chapter.documentTitle;
    }

    const baseSlug = slugifyHeading(chapter.chapterTitle) || `chapter-${index + 1}`;
    const nextCount = (usedSlugs.get(baseSlug) || 0) + 1;
    usedSlugs.set(baseSlug, nextCount);

    chapters.push({
      title: chapter.chapterTitle,
      slug: nextCount === 1 ? baseSlug : `${baseSlug}-${nextCount}`,
      tokens: chapter.contentTokens,
    });
  }

  return { documentTitle, chapters };
}

function populateChapterMenu(select, chapters) {
  if (!chapters.length) {
    select.innerHTML = '<option value="">No chapters available</option>';
    select.disabled = true;
    return;
  }

  const options = chapters
    .map(
      (chapter, index) =>
        `<option value="${chapter.slug}">Chapter ${index + 1}: ${escapeHtml(chapter.title)}</option>`,
    )
    .join("");

  select.innerHTML = `
    <option value="">Jump to chapter</option>
    ${options}
  `;
  select.disabled = false;
}

function getChapterIndexFromHash(chapters) {
  const chapterSlug = decodeURIComponent(window.location.hash.replace(/^#/, "")).trim();

  if (!chapterSlug) {
    return 0;
  }

  const chapterIndex = chapters.findIndex((chapter) => chapter.slug === chapterSlug);
  return chapterIndex >= 0 ? chapterIndex : 0;
}

function renderChapter({ card, jumpSelect, heroTitle, subtitle }, chapterData, chapterIndex) {
  const { documentTitle, chapters } = chapterData;
  const chapter = chapters[chapterIndex];
  const previousChapter = chapters[chapterIndex - 1];
  const nextChapter = chapters[chapterIndex + 1];
  const chapterHtml = DOMPurify.sanitize(marked.parser(chapter.tokens));

  heroTitle.textContent = documentTitle;
  subtitle.textContent = `${chapter.title} · Chapter ${chapterIndex + 1} of ${chapters.length}`;
  jumpSelect.value = chapter.slug;
  document.title = `${chapter.title} | ${documentTitle}`;

  card.innerHTML = `
    <div class="chapter-shell">
      <header class="chapter-header">
        <p class="chapter-kicker">Chapter ${chapterIndex + 1} of ${chapters.length}</p>
        <h2 class="chapter-title">${escapeHtml(chapter.title)}</h2>
      </header>

      <div class="journal-content">${chapterHtml}</div>

      <nav class="chapter-nav" aria-label="Chapter navigation">
        ${
          previousChapter
            ? `<a class="chapter-link chapter-link-previous" href="#${previousChapter.slug}" data-chapter-target="${previousChapter.slug}">Previous: ${escapeHtml(previousChapter.title)}</a>`
            : '<span class="chapter-link-spacer" aria-hidden="true"></span>'
        }
        ${
          nextChapter
            ? `<a class="chapter-link chapter-link-next" href="#${nextChapter.slug}" data-chapter-target="${nextChapter.slug}">Continue: ${escapeHtml(nextChapter.title)}</a>`
            : '<span class="chapter-link-spacer" aria-hidden="true"></span>'
        }
      </nav>
    </div>
  `;
}

function scrollToChapterStart() {
  document.querySelector(".hero-panel")?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

async function renderJournal() {
  app.innerHTML = `
    <main class="page-shell">
      <section class="hero-panel" aria-label="Travel journal overview">
        <div class="hero-copy">
          <p class="kicker">Asia Overland Chronicle</p>
          <h1 class="hero-title">Loading travel journal...</h1>
          <p class="subtitle">
            Preparing chapter navigation...
          </p>
        </div>
        <div class="hero-actions">
          <p class="journey-seal">Route Archive</p>
          <label class="jump-label" for="section-jump">Jump to chapter</label>
          <select id="section-jump" class="jump-select" disabled>
            <option value="">Loading chapters...</option>
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
  const heroTitle = document.querySelector(".hero-title");
  const subtitle = document.querySelector(".subtitle");

  jumpSelect.addEventListener("change", (event) => {
    const targetChapter = event.target.value;
    if (!targetChapter) {
      return;
    }

    window.location.hash = targetChapter;
  });

  card.addEventListener("click", (event) => {
    const chapterLink = event.target.closest("[data-chapter-target]");

    if (!chapterLink) {
      return;
    }

    event.preventDefault();
    window.location.hash = chapterLink.dataset.chapterTarget;
  });

  try {
    const chapterData = await loadChapterData();

    populateChapterMenu(jumpSelect, chapterData.chapters);

    const syncChapter = ({ scroll = false } = {}) => {
      const chapterIndex = getChapterIndexFromHash(chapterData.chapters);
      renderChapter({ card, jumpSelect, heroTitle, subtitle }, chapterData, chapterIndex);

      if (scroll) {
        scrollToChapterStart();
      }
    };

    window.addEventListener("hashchange", () => {
      syncChapter({ scroll: true });
    });

    syncChapter();
  } catch (error) {
    jumpSelect.innerHTML = '<option value="">Chapters unavailable</option>';
    heroTitle.textContent = "Travel journal unavailable";
    subtitle.textContent = "The chapter view could not be prepared.";
    card.innerHTML = `
      <p class="status error">Unable to load the travel narrative.</p>
      <p class="error-detail">${error.message}</p>
    `;
  }
}

renderJournal();