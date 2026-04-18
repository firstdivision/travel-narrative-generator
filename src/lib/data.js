import { slugifyHeading } from "./format";
import { extractChapterFromMarkdown } from "./markdown";

function hashContent(value) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }

  return String(hash >>> 0);
}

function buildChapterIdentifier(date, index) {
  const seed = date || `chapter-${index + 1}`;
  return `ch-${hashContent(seed)}`;
}

export function getManifestSignature(manifest) {
  const chapters = Array.isArray(manifest?.chapters)
    ? manifest.chapters.map((chapter) => ({
        id: chapter?.id || "",
        date: chapter?.date || "",
        title: chapter?.title || "",
        displaySlug: chapter?.displaySlug || "",
        slug: chapter?.slug || "",
        prettySlug: chapter?.prettySlug || "",
        file: chapter?.file || "",
        contentHash: chapter?.contentHash || "",
        hasPhotos: Boolean(chapter?.hasPhotos),
      }))
    : [];

  return JSON.stringify({ chapters });
}

export async function loadNarrativeManifest() {
  const manifestResponse = await fetch("/travel/narrative/manifest.json", {
    cache: "no-cache",
  });

  if (!manifestResponse.ok) {
    throw new Error(`Failed to load manifest (${manifestResponse.status})`);
  }

  return manifestResponse.json();
}

export async function loadNarrativeManifestMetadata() {
  const manifest = await loadNarrativeManifest();
  const manifestSignature = getManifestSignature(manifest);
  const chapterEntries = Array.isArray(manifest.chapters) ? manifest.chapters : [];

  if (!chapterEntries.length) {
    throw new Error("No chapter files were found in the manifest.");
  }

  const chapters = chapterEntries.map((chapterEntry, index) => {
    const fallbackSlug = buildChapterIdentifier(chapterEntry?.date || "", index);
    const slug = chapterEntry?.id || chapterEntry?.slug || fallbackSlug;
    const title = chapterEntry?.title || chapterEntry?.date || `Chapter ${index + 1}`;

    return {
      id: slug,
      title,
      displaySlug: chapterEntry?.displaySlug || title,
      slug,
      prettySlug: chapterEntry?.prettySlug || slugifyHeading(title) || `chapter-${index + 1}`,
      date: chapterEntry?.date || null,
      file: chapterEntry?.file || "",
      contentHash: chapterEntry?.contentHash || "",
      hasPhotos: chapterEntry?.hasPhotos !== false,
      tokens: null,
    };
  });

  return {
    chapters,
    manifestSignature,
  };
}

export async function loadChapterContent(chapterFile, fallbackTitle) {
  if (!chapterFile) {
    throw new Error("Chapter file path is missing from the manifest.");
  }

  const chapterResponse = await fetch(chapterFile, { cache: "no-cache" });

  if (!chapterResponse.ok) {
    throw new Error(`Failed to load chapter markdown (${chapterResponse.status})`);
  }

  const markdown = await chapterResponse.text();
  const trimmedMarkdown = markdown.trimStart().toLowerCase();

  if (trimmedMarkdown.startsWith("<!doctype html") || trimmedMarkdown.startsWith("<html")) {
    throw new Error(`Chapter file \"${chapterFile}\" returned HTML instead of markdown.`);
  }

  const chapter = extractChapterFromMarkdown(markdown, fallbackTitle);

  return {
    ...chapter,
    markdown,
  };
}

export async function loadChapterData() {
  const { chapters: metadataChapters, manifestSignature } = await loadNarrativeManifestMetadata();
  const chapters = [];
  let documentTitle = "Travel Journal";

  for (const [index, chapterEntry] of metadataChapters.entries()) {
    const fallbackTitle = chapterEntry.title || `Chapter ${index + 1}`;
    const chapter = await loadChapterContent(chapterEntry.file, fallbackTitle);

    if (index === 0 && chapter.documentTitle) {
      documentTitle = chapter.documentTitle;
    }

    chapters.push({
      title: chapter.chapterTitle,
      slug: chapterEntry.slug,
      tokens: chapter.contentTokens,
      date: chapterEntry.date,
      contentHash: chapterEntry.contentHash || hashContent(chapter.markdown),
      hasPhotos: chapterEntry.hasPhotos,
      file: chapterEntry.file,
    });
  }

  return { documentTitle, chapters, manifestSignature };
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
