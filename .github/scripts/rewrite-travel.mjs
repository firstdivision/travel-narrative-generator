import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const daysDir = "public/travel/days";
const narrativeDir = "public/travel/narrative";
const stylePath = "public/travel/style.md";
const sourceDayFilesFromEnv = (process.env.SOURCE_DAY_FILES || "")
  .split("\n")
  .map((filePath) => filePath.trim())
  .filter(Boolean);

const sourceDayFilesFromArgv = process.argv.slice(2).filter(Boolean);
const sourceDayFiles =
  sourceDayFilesFromEnv.length > 0
    ? sourceDayFilesFromEnv
    : sourceDayFilesFromArgv;

if (sourceDayFiles.length === 0) {
  throw new Error(
    "Missing source day file(s). Provide SOURCE_DAY_FILES or pass file paths as argv[2+].",
  );
}

for (const sourceDayFile of sourceDayFiles) {
  if (!sourceDayFile.startsWith(`${daysDir}/`) || !sourceDayFile.endsWith(".md")) {
    throw new Error(
      `Invalid source file '${sourceDayFile}'. Expected '${daysDir}/YYYY-MM-DD.md'.`,
    );
  }

  if (!fs.existsSync(sourceDayFile)) {
    throw new Error(`Source notes file not found: ${sourceDayFile}`);
  }
}

const style = fs.existsSync(stylePath)
  ? fs.readFileSync(stylePath, "utf8")
  : "";

for (const sourceDayFile of sourceDayFiles) {
  const chapterFileName = path.basename(sourceDayFile);
  const outputPath = path.join(narrativeDir, chapterFileName);
  const notes = fs.readFileSync(sourceDayFile, "utf8");

  const prompt = `
You are rewriting raw travel notes into a polished first-person travel narrative.

Requirements:
- Preserve factual details from the notes.
- Keep the narrator's observations, mood, and chronology.
- Write vividly, but do not invent events.
- Keep proper nouns and logistics accurate.
- Preserve markdown headings from source notes.
- Keep heading levels intact (for example, # remains # and ## remains ##).
- Keep headings in the same order they appear in the source.
- Output only markdown for the final narrative.
- Keep the chapter focused on this specific day file: ${chapterFileName}

Style guide:
${style}

Source notes:
${notes}
`;

  const response = await client.responses.create({
    model: "gpt-5.4",
    input: prompt,
  });

  const text =
    response.output_text ||
    "No narrative was returned by the model.";

  fs.mkdirSync(narrativeDir, { recursive: true });
  fs.writeFileSync(outputPath, text);
  console.log(`Updated ${outputPath}`);
}

const narrativeFiles = fs
  .readdirSync(narrativeDir)
  .filter((fileName) => fileName.endsWith(".md"))
  .sort();

const photosDir = "public/travel/photos";
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"]);

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

function chapterIdFromDate(date, index) {
  const seed = date || `chapter-${index + 1}`;
  return `ch-${createHash("sha256").update(seed).digest("hex").slice(0, 12)}`;
}

function hasPhotosForDate(date) {
  const dayDir = path.join(photosDir, date);
  try {
    if (!fs.statSync(dayDir).isDirectory()) return false;
    return fs.readdirSync(dayDir).some((fileName) =>
      imageExtensions.has(path.extname(fileName).toLowerCase())
    );
  } catch {
    return false;
  }
}

const manifest = {
  generatedAt: new Date().toISOString(),
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
    contentHash: createHash("sha256").update(markdown).digest("hex"),
    hasPhotos: hasPhotosForDate(date),
  });
}

fs.writeFileSync(
  path.join(narrativeDir, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
console.log(`Updated ${path.join(narrativeDir, "manifest.json")}`);