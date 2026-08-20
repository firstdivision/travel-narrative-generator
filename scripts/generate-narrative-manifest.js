import fs from "fs";
import path from "path";
import { createHash } from "crypto";

const narrativeDir = "public/travel/narrative";
const daysDir = "public/travel/days";
const photosDir = "public/travel/photos";
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"]);
const placeholderBodyPattern = /^\s*\[.*\]\s*$/s;

const narrativeFiles = fs
  .readdirSync(narrativeDir)
  .filter((fileName) => fileName.endsWith(".md"))
  .sort();

function slugifyHeading(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function extractChapterTitle(markdown, fallbackTitle) {
  const lines = markdown.split(/\r?\n/);

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.+)$/);

    if (headingMatch?.[1]) {
      return headingMatch[1].trim();
    }
  }

  return fallbackTitle;
}

function hashContent(value) {
  return createHash("sha256").update(value).digest("hex");
}

function chapterIdFromDate(date, index) {
  const seed = date || `chapter-${index + 1}`;
  return `ch-${createHash("sha256").update(seed).digest("hex").slice(0, 12)}`;
}

function hasPhotosForDate(date) {
  const dayDir = path.join(photosDir, date);

  try {
    if (!fs.statSync(dayDir).isDirectory()) {
      return false;
    }

    const dayFiles = fs.readdirSync(dayDir);

    return dayFiles.some((fileName) => {
      const extension = path.extname(fileName).toLowerCase();
      return imageExtensions.has(extension);
    });
  } catch {
    return false;
  }
}

function hasDaysForDate(date) {
  const daysPath = path.join(daysDir, `${date}.md`);

  let markdown;

  try {
    markdown = fs.readFileSync(daysPath, "utf8");
  } catch {
    return false;
  }

  // Ungenerated placeholder prompts (e.g. "[Generate an introduction...]") aren't real journal content.
  const body = markdown.replace(/^##\s+.+$/m, "").trim();

  return body.length > 0 && !placeholderBodyPattern.test(body);
}

const manifest = {
  chapters: [],
};

for (const [index, fileName] of narrativeFiles.entries()) {
    const absolutePath = path.join(narrativeDir, fileName);
    const markdown = fs.readFileSync(absolutePath, "utf8");
    const date = fileName.replace(/\.md$/, "");
    const fallbackTitle = date || `Chapter ${index + 1}`;
    const title = extractChapterTitle(markdown, fallbackTitle);
    const id = chapterIdFromDate(date, index);
    const prettySlug = slugifyHeading(title) || `chapter-${index + 1}`;

    manifest.chapters.push({
      id,
      date,
      file: `/travel/narrative/${fileName}`,
      title,
      displaySlug: title,
      slug: id,
      prettySlug,
      contentHash: hashContent(markdown),
      hasPhotos: hasPhotosForDate(date),
      daysFile: hasDaysForDate(date) ? `/travel/days/${date}.md` : null,
    });
}

const outputPath = path.join(narrativeDir, "manifest.json");
fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Updated ${outputPath} (${manifest.chapters.length} chapter(s))`);
