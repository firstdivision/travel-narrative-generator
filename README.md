# Travel Journal Web App

This project is now a Vite-powered web app that renders travel journal chapters from markdown at runtime.

## Source Content

The markdown files live in `public/travel/` with per-day chapters:

```text
travel/
	days/
		2026-04-10.md
		2026-04-11.md
	narrative/
		2026-04-10.md
		2026-04-11.md
		manifest.json
	style.md
```

- `public/travel/days/*.md` contains raw notes chapters.
- `public/travel/narrative/*.md` contains rewritten chapters produced by the GitHub Action.
- `public/travel/narrative/manifest.json` lists chapters for the browser app.

The page fetches `public/travel/narrative/manifest.json` and then loads each chapter markdown file in order.

## Run Locally

1. Install dependencies:

	```bash
	npm install
	```

2. Start the development server:

	```bash
	npm run dev
	```

3. Build for production:

	```bash
	npm run build
	```

4. Preview the production build:

	```bash
	npm run preview
	```
