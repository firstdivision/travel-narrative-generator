import fs from "fs";
import path from "path";

const narrativeDir = "public/travel/narrative";

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

const outputPath = path.join(narrativeDir, "manifest.json");
fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Updated ${outputPath} (${manifest.chapters.length} chapter(s))`);
