---
description: "Use when editing the travel narrative app, chapter loading flow, manifest generation, or content scripts. Covers manifest-first chapter discovery, date-based content layout, and generated photo indexes."
name: "Manifest-First Content"
---
# Manifest-First Content

- Treat `public/travel/narrative/manifest.json` as the source of truth for chapter discovery and order in the web app.
- Do not hardcode chapter lists, markdown paths, or chapter order in `src/main.js`; load chapters from the manifest contract instead.
- Keep chapter identifiers date-based. Narrative markdown files should stay named like `YYYY-MM-DD.md` or `YYYY-MM-DD-suffix.md`, and manifest `date` values should continue to match the filename stem.
- Preserve the manifest entry shape used by the app and generator script:

```json
{
  "date": "2026-04-02",
  "file": "/travel/narrative/2026-04-02.md"
}
```

- When changing how narrative files are discovered or ordered, update `scripts/generate-narrative-manifest.js` instead of duplicating that logic in the frontend.
- When changing how photos are discovered, keep `scripts/generate-photo-indexes.js` responsible for writing `public/travel/photos/<date>/index.json`, and keep the frontend consuming those generated indexes.
- If a change adds or renames narrative markdown files, regenerate `public/travel/narrative/manifest.json` before considering the change complete.