import fs from "fs";
import path from "path";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const daysDir = "public/travel/days";
const narrativeDir = "public/travel/narrative";
const stylePath = "public/travel/style.md";
const sourceDayFile = process.env.SOURCE_DAY_FILE || process.argv[2];

if (!sourceDayFile) {
  throw new Error(
    "Missing source day file. Provide SOURCE_DAY_FILE or pass the file path as argv[2].",
  );
}

if (!sourceDayFile.startsWith(`${daysDir}/`) || !sourceDayFile.endsWith(".md")) {
  throw new Error(
    `Invalid source file '${sourceDayFile}'. Expected '${daysDir}/YYYY-MM-DD.md'.`,
  );
}

if (!fs.existsSync(sourceDayFile)) {
  throw new Error(`Source notes file not found: ${sourceDayFile}`);
}

const chapterFileName = path.basename(sourceDayFile);
const outputPath = path.join(narrativeDir, chapterFileName);

const notes = fs.readFileSync(sourceDayFile, "utf8");
const style = fs.existsSync(stylePath)
  ? fs.readFileSync(stylePath, "utf8")
  : "";

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
  input: prompt
});

const text =
  response.output_text ||
  "No narrative was returned by the model.";

fs.mkdirSync(narrativeDir, { recursive: true });
fs.writeFileSync(outputPath, text);
console.log(`Updated ${outputPath}`);

const narrativeFiles = fs
  .readdirSync(narrativeDir)
  .filter((fileName) => fileName.endsWith(".md"))
  .sort();

const manifest = {
  generatedAt: new Date().toISOString(),
  chapters: narrativeFiles.map((fileName) => ({
    date: fileName.replace(/\.md$/, ""),
    file: `/travel/narrative/${fileName}`,
  })),
};

fs.writeFileSync(
  path.join(narrativeDir, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
console.log(`Updated ${path.join(narrativeDir, "manifest.json")}`);