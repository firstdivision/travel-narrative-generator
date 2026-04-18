import fs from "fs";
import path from "path";
import { createHash } from "crypto";

const narrativeDir = "public/travel/narrative";
const photosDir = "public/travel/photos";
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"]);

const narrativeFiles = fs
  .readdirSync(narrativeDir)
  .filter((fileName) => fileName.endsWith(".md"))
  .sort();

function hashContent(value) {
  return createHash("sha256").update(value).digest("hex");
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

const manifest = {
  generatedAt: new Date().toISOString(),
  chapters: narrativeFiles.map((fileName) => {
    const absolutePath = path.join(narrativeDir, fileName);
    const markdown = fs.readFileSync(absolutePath, "utf8");

    return {
      date: fileName.replace(/\.md$/, ""),
      file: `/travel/narrative/${fileName}`,
      contentHash: hashContent(markdown),
      hasPhotos: hasPhotosForDate(fileName.replace(/\.md$/, "")),
    };
  }),
};

const outputPath = path.join(narrativeDir, "manifest.json");
fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Updated ${outputPath} (${manifest.chapters.length} chapter(s))`);
