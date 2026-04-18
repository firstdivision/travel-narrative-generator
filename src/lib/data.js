import { slugifyHeading } from "./format";
import { extractChapterFromMarkdown } from "./markdown";

export async function loadChapterData() {
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

export async function loadPhotosForDate(date) {
  if (!date) {
    return [];
  }

  try {
    const response = await fetch(`/travel/photos/${date}/index.json`, { cache: "no-cache" });

    if (!response.ok) {
      return [];
    }

    const filenames = await response.json();

    if (!Array.isArray(filenames)) {
      return [];
    }

    return filenames.map((filename) => `/travel/photos/${date}/${filename}`);
  } catch {
    return [];
  }
}
