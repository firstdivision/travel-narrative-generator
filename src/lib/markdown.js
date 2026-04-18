import { marked } from "marked";
import DOMPurify from "dompurify";
import { escapeHtml } from "./format";

function renderPoemBlock(text) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4);

  if (!lines.length) {
    return "";
  }

  const poemLines = lines
    .map((line) => `<p class="chapter-poem-line">${escapeHtml(line)}</p>`)
    .join("");

  return `
    <section class="chapter-poem" aria-label="Chapter poem">
      ${poemLines}
    </section>
  `;
}

const renderer = new marked.Renderer();

renderer.code = (token) => {
  if (token.lang === "poem") {
    return renderPoemBlock(token.text);
  }

  const languageClass = token.lang ? ` class="language-${escapeHtml(token.lang)}"` : "";
  return `<pre><code${languageClass}>${escapeHtml(token.text)}</code></pre>`;
};

marked.setOptions({
  gfm: true,
  breaks: true,
  renderer,
});

function normalizeLeadingPoemToken(tokens) {
  const [firstToken, ...remainingTokens] = tokens;

  if (!firstToken || firstToken.type !== "paragraph" || !Array.isArray(firstToken.tokens)) {
    return tokens;
  }

  if (firstToken.tokens.length !== 7) {
    return tokens;
  }

  const poemLines = [];

  for (const [index, token] of firstToken.tokens.entries()) {
    const expectsText = index % 2 === 0;

    if (expectsText) {
      if (token.type !== "text") {
        return tokens;
      }

      const line = token.text.trim();

      if (!line) {
        return tokens;
      }

      poemLines.push(line);
      continue;
    }

    if (token.type !== "br") {
      return tokens;
    }
  }

  if (poemLines.length !== 4) {
    return tokens;
  }

  return [
    {
      type: "code",
      raw: firstToken.raw,
      lang: "poem",
      text: poemLines.join("\n"),
    },
    ...remainingTokens,
  ];
}

export function extractChapterFromMarkdown(markdown, fallbackTitle) {
  const tokens = marked.lexer(markdown);
  let documentTitle = null;
  let chapterTitle = null;
  const contentTokens = [];

  for (const token of tokens) {
    if (!documentTitle && token.type === "heading" && token.depth === 1) {
      documentTitle = token.text;
      continue;
    }

    if (!chapterTitle && token.type === "heading" && token.depth === 2) {
      chapterTitle = token.text;
      continue;
    }

    contentTokens.push(token);
  }

  return {
    documentTitle,
    chapterTitle: chapterTitle || fallbackTitle,
    contentTokens: normalizeLeadingPoemToken(contentTokens),
  };
}

export function renderChapterHtml(tokens) {
  return DOMPurify.sanitize(marked.parser(tokens));
}
