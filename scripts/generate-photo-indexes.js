import { readdirSync, writeFileSync, statSync } from "fs";
import { join } from "path";

const PHOTOS_ROOT = new URL("../public/travel/photos", import.meta.url).pathname;
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"]);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

let dirs;
try {
  dirs = readdirSync(PHOTOS_ROOT);
} catch {
  console.log("No photos directory found, skipping photo index generation.");
  process.exit(0);
}

for (const name of dirs) {
  if (!DATE_PATTERN.test(name)) continue;

  const dayPath = join(PHOTOS_ROOT, name);
  if (!statSync(dayPath).isDirectory()) continue;

  const images = readdirSync(dayPath)
    .filter((f) => {
      const ext = f.slice(f.lastIndexOf(".")).toLowerCase();
      return IMAGE_EXTENSIONS.has(ext);
    })
    .sort();

  const indexPath = join(dayPath, "index.json");
  writeFileSync(indexPath, JSON.stringify(images, null, 2) + "\n");
  console.log(`  photos/${name}/index.json — ${images.length} image(s)`);
}
