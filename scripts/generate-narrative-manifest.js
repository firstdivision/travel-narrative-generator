import fs from "fs";
import path from "path";
import { createHash } from "crypto";

const narrativeDir = "public/travel/narrative";

const narrativeFiles = fs
  .readdirSync(narrativeDir)
  .filter((fileName) => fileName.endsWith(".md"))
  .sort();

function hashContent(value) {
  return createHash("sha256").update(value).digest("hex");
}

const manifest = {
  generatedAt: new Date().toISOString(),
  chapters: narrativeFiles.map((fileName) => {
    const absolutePath = path.join(narrativeDir, fileName);
    const markdown = fs.readFileSync(absolutePath, "utf8");

    return {
      date: fileName.replace(/\.md$/, ""),
      file: `/travel/narrative/${fileName}`,
      contentHash: hashContent(markdown),
    };
  }),
};

const outputPath = path.join(narrativeDir, "manifest.json");
fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Updated ${outputPath} (${manifest.chapters.length} chapter(s))`);
