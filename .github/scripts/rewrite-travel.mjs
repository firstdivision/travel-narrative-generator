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

function hasValidPoemBlock(poemBody) {
  const lines = poemBody
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  return lines.length === 4;
}

function hasRequiredTopPoem(markdown) {
  const normalized = markdown.replace(/^\uFEFF/, "").trimStart();

  // Case 1: no H1 title, poem must be at the top.
  const topPoemMatch = normalized.match(/^```poem\n([\s\S]*?)\n```/);
  if (topPoemMatch?.[1] && hasValidPoemBlock(topPoemMatch[1])) {
    return true;
  }

  // Case 2: with H1 title, poem must be immediately after H1.
  const h1ThenPoemMatch = normalized.match(/^#\s+.+\n(?:\n)?```poem\n([\s\S]*?)\n```/);
  if (h1ThenPoemMatch?.[1] && hasValidPoemBlock(h1ThenPoemMatch[1])) {
    return true;
  }

  return false;
}

for (const sourceDayFile of sourceDayFiles) {
  const chapterFileName = path.basename(sourceDayFile);
  const outputPath = path.join(narrativeDir, chapterFileName);
  const notes = fs.readFileSync(sourceDayFile, "utf8");

  const basePrompt = `
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
- Include one required poem block using this exact shape:
  \`\`\`poem
  line 1
  line 2
  line 3
  line 4
  \`\`\`
- Placement rule: if there is no H1 heading in the output, the poem block must be the very first content in the file. If there is an H1 heading, place the poem block immediately after the H1 heading.

Style guide:
${style}

Source notes:
${notes}
`;

  let text = "";
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const retryReminder =
      attempt === 1
        ? ""
        : "\n\nValidation reminder: Your previous output failed poem validation. Return markdown that includes a correctly placed ```poem block with exactly four non-empty lines.";

    const response = await client.responses.create({
      model: "gpt-5.4",
      input: `${basePrompt}${retryReminder}`,
    });

    text = response.output_text || "No narrative was returned by the model.";
    if (hasRequiredTopPoem(text)) {
      break;
    }

    if (attempt === maxAttempts) {
      console.warn(
        `Warning: ${chapterFileName} was generated without a valid top poem block after ${maxAttempts} attempts.`,
      );
    }
  }

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