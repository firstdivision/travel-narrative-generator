import "./styles.css";
import { marked } from "marked";
import DOMPurify from "dompurify";

const app = document.querySelector("#app");

function renderPoemBlock(text) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4);

  if (!lines.length) {
    return "";
  }

  const poemLines = lines
    .map((line) => `<p class="chapter-poem-line">${escapeHtml(line)}</p>`)
    .join("");

  return `
    <section class="chapter-poem" aria-label="Chapter poem">
      ${poemLines}
    </section>
  `;
}

const renderer = new marked.Renderer();

renderer.code = (token) => {
  if (token.lang === "poem") {
    return renderPoemBlock(token.text);
  }

  const languageClass = token.lang ? ` class="language-${escapeHtml(token.lang)}"` : "";
  return `<pre><code${languageClass}>${escapeHtml(token.text)}</code></pre>`;
};

marked.setOptions({
  gfm: true,
  breaks: true,
  renderer,
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

function normalizeLeadingPoemToken(tokens) {
  const [firstToken, ...remainingTokens] = tokens;

  if (!firstToken || firstToken.type !== "paragraph" || !Array.isArray(firstToken.tokens)) {
    return tokens;
  }

  if (firstToken.tokens.length !== 7) {
    return tokens;
  }

  const poemLines = [];

  for (const [index, token] of firstToken.tokens.entries()) {
    const expectsText = index % 2 === 0;

    if (expectsText) {
      if (token.type !== "text") {
        return tokens;
      }

      const line = token.text.trim();

      if (!line) {
        return tokens;
      }

      poemLines.push(line);
      continue;
    }

    if (token.type !== "br") {
      return tokens;
    }
  }

  if (poemLines.length !== 4) {
    return tokens;
  }

  return [
    {
      type: "code",
      raw: firstToken.raw,
      lang: "poem",
      text: poemLines.join("\n"),
    },
    ...remainingTokens,
  ];
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
    contentTokens: normalizeLeadingPoemToken(contentTokens),
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
    const trimmedMarkdown = markdown.trimStart().toLowerCase();

    if (trimmedMarkdown.startsWith("<!doctype html") || trimmedMarkdown.startsWith("<html")) {
      throw new Error(`Chapter file \"${chapterEntry.file}\" returned HTML instead of markdown.`);
    }

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
      date: chapterEntry.date || null,
    });
  }

  return { documentTitle, chapters };
}

// ── Photo gallery & lightbox ─────────────────────────────────────────────────

let lightboxPhotos = [];
let lightboxIndex = 0;
let lightboxEl = null;
let lightboxImgEl = null;

function initLightbox() {
  if (lightboxEl) return;

  lightboxEl = document.createElement("div");
  lightboxEl.className = "lightbox";
  lightboxEl.setAttribute("role", "dialog");
  lightboxEl.setAttribute("aria-modal", "true");
  lightboxEl.setAttribute("aria-label", "Photo viewer");
  lightboxEl.hidden = true;
  lightboxEl.innerHTML = `
    <div class="lightbox-backdrop"></div>
    <button class="lightbox-close" aria-label="Close photo viewer">&#x2715;</button>
    <button class="lightbox-prev" aria-label="Previous photo">&#x2039;</button>
    <button class="lightbox-next" aria-label="Next photo">&#x203A;</button>
    <figure class="lightbox-figure">
      <img class="lightbox-img" src="" alt="" />
    </figure>
  `;
  document.body.appendChild(lightboxEl);
  lightboxImgEl = lightboxEl.querySelector(".lightbox-img");

  lightboxEl.querySelector(".lightbox-backdrop").addEventListener("click", closeLightbox);
  lightboxEl.querySelector(".lightbox-close").addEventListener("click", closeLightbox);
  lightboxEl.querySelector(".lightbox-prev").addEventListener("click", () => shiftLightbox(-1));
  lightboxEl.querySelector(".lightbox-next").addEventListener("click", () => shiftLightbox(1));

  let touchStartX = 0;
  lightboxEl.addEventListener("touchstart", (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
  lightboxEl.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) shiftLightbox(dx < 0 ? 1 : -1);
  }, { passive: true });

  document.addEventListener("keydown", (e) => {
    if (!lightboxEl || lightboxEl.hidden) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") shiftLightbox(-1);
    if (e.key === "ArrowRight") shiftLightbox(1);
  });
}

function openLightbox(photos, index) {
  lightboxPhotos = photos;
  lightboxIndex = index;
  syncLightboxImage();
  lightboxEl.hidden = false;
  document.body.style.overflow = "hidden";
  lightboxEl.querySelector(".lightbox-close").focus();
}

function closeLightbox() {
  lightboxEl.hidden = true;
  document.body.style.overflow = "";
}

function shiftLightbox(dir) {
  lightboxIndex = (lightboxIndex + dir + lightboxPhotos.length) % lightboxPhotos.length;
  syncLightboxImage();
}

function syncLightboxImage() {
  lightboxImgEl.src = lightboxPhotos[lightboxIndex];
  lightboxImgEl.alt = `Photo ${lightboxIndex + 1} of ${lightboxPhotos.length}`;
  const single = lightboxPhotos.length <= 1;
  lightboxEl.querySelector(".lightbox-prev").hidden = single;
  lightboxEl.querySelector(".lightbox-next").hidden = single;
}

async function loadPhotosForDate(date) {
  if (!date) return [];
  try {
    const res = await fetch(`/travel/photos/${date}/index.json`, { cache: "no-cache" });
    if (!res.ok) return [];
    const filenames = await res.json();
    if (!Array.isArray(filenames)) return [];
    return filenames.map((f) => `/travel/photos/${date}/${f}`);
  } catch {
    return [];
  }
}

function buildPhotoGallery(photos) {
  const thumbs = photos
    .map(
      (src, i) =>
        `<button class="gallery-thumb-btn" data-gallery-index="${i}" aria-label="Open photo ${i + 1} of ${photos.length}">` +
        `<img class="gallery-thumb" src="${escapeHtml(src)}" alt="Day photo ${i + 1}" loading="lazy" /></button>`,
    )
    .join("");

  return `<section class="photo-gallery" aria-label="Day photographs">${thumbs}</section>`;
}

// ── Chapter menu ─────────────────────────────────────────────────────────────

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

function renderChapter({ card, jumpSelect, heroTitleLink, subtitle }, chapterData, chapterIndex) {
  const { documentTitle, chapters } = chapterData;
  const chapter = chapters[chapterIndex];
  const previousChapter = chapters[chapterIndex - 1];
  const nextChapter = chapters[chapterIndex + 1];
  const chapterHtml = DOMPurify.sanitize(marked.parser(chapter.tokens));

  heroTitleLink.textContent = documentTitle;
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

      <div class="photo-gallery-slot" hidden></div>

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

  if (chapter.date) {
    loadPhotosForDate(chapter.date).then((photos) => {
      const slot = card.querySelector(".photo-gallery-slot");
      if (!slot || !photos.length) return;

      slot.outerHTML = buildPhotoGallery(photos);

      card.querySelectorAll(".gallery-thumb-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          openLightbox(photos, Number(btn.dataset.galleryIndex));
        });
      });
    });
  }
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
        <div class="hero-script-cloud" aria-hidden="true">
          <span class="hero-script hero-script-jp hero-script-1">旅の記録 ・ 道 ・ 風景</span>
          <span class="hero-script hero-script-th hero-script-2">สวัสดี · การเดินทาง · บันทึก</span>
          <span class="hero-script hero-script-ms hero-script-3">Selamat Jalan · Catatan · Kenangan</span>
          <span class="hero-script hero-script-jp hero-script-4">列車の窓 ・ 雨 ・ 夜明け</span>
          <span class="hero-script hero-script-th hero-script-5">ตลาด · กลิ่นชา · เสียงรถไฟ</span>
          <span class="hero-script hero-script-ms hero-script-6">Rasa Jalanan · Hujan Tropika</span>
          <span class="hero-script hero-script-jp hero-script-7">古い地図 ・ 寄り道 ・ 記憶</span>
          <span class="hero-script hero-script-th hero-script-8">แม่น้ำ · ถนน · เรื่องเล่า</span>
          <span class="hero-script hero-script-ms hero-script-9">Laluan Lama · Cerita Baru</span>
          <span class="hero-script hero-script-jp hero-script-10">朝の駅 ・ 旅人 ・ 光</span>
          <span class="hero-script hero-script-th hero-script-11">รอยยิ้ม · เส้นทาง · เวลา</span>
          <span class="hero-script hero-script-ms hero-script-12">Selamat Datang · Jejak</span>
          <span class="hero-script hero-script-jp hero-script-13">港町 ・ 提灯 ・ 夜風</span>
          <span class="hero-script hero-script-th hero-script-14">อาหารริมทาง · สีสัน · เมืองเก่า</span>
          <span class="hero-script hero-script-ms hero-script-15">Pasar Malam · Bau Rempah</span>
          <span class="hero-script hero-script-jp hero-script-16">静かな寺 ・ 石畳 ・ 影</span>
          <span class="hero-script hero-script-th hero-script-17">ทะเล · ฝน · ความทรงจำ</span>
          <span class="hero-script hero-script-ms hero-script-18">Nadi Kota · Langkah Kaki</span>
          <span class="hero-script hero-script-jp hero-script-19">旅の途中 ・ 小さな奇跡</span>
          <span class="hero-script hero-script-th hero-script-20">รถสองแถว · ทางโค้ง · แสงเย็น</span>
          <span class="hero-script hero-script-ms hero-script-21">Cerita Jalan · Arah Selatan</span>
          <span class="hero-script hero-script-jp hero-script-22">山の霧 ・ 朝市 ・ 手紙</span>
        </div>
        <div class="hero-copy">
          <p class="kicker">
            <a class="hero-home-link" href="#" aria-label="Return to home page">
              Asia Overland Chronicle
            </a>
          </p>
          <h1>
            <a class="hero-title hero-home-link" href="#" aria-label="Return to home page">
              Loading travel journal...
            </a>
          </h1>
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
  const heroTitleLink = document.querySelector(".hero-title");
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

    initLightbox();
    populateChapterMenu(jumpSelect, chapterData.chapters);

    const syncChapter = ({ scroll = false } = {}) => {
      const chapterIndex = getChapterIndexFromHash(chapterData.chapters);
      renderChapter({ card, jumpSelect, heroTitleLink, subtitle }, chapterData, chapterIndex);

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
    heroTitleLink.textContent = "Travel journal unavailable";
    subtitle.textContent = "The chapter view could not be prepared.";
    card.innerHTML = `
      <p class="status error">Unable to load the travel narrative.</p>
      <p class="error-detail">${error.message}</p>
    `;
  }
}

renderJournal();