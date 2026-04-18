import { useMemo } from "react";
import { renderChapterHtml } from "../lib/markdown";
import { PhotoGallery } from "./PhotoGallery";

export function ChapterView({ chapter, chapterIndex, chapters, onOpenLightbox }) {
  const chapterHtml = useMemo(() => renderChapterHtml(chapter.tokens), [chapter.tokens]);
  const totalChapters = chapters.length;
  const previousChapter = chapters[chapterIndex - 1] ?? null;
  const nextChapter = chapters[chapterIndex + 1] ?? null;

  return (
    <div className="chapter-shell">
      <header className="chapter-header">
        <p className="chapter-kicker">{`Chapter ${chapterIndex + 1} of ${totalChapters}`}</p>
        <h2 className="chapter-title">{chapter.title}</h2>
      </header>

      <div className="journal-content" dangerouslySetInnerHTML={{ __html: chapterHtml }} />

      <PhotoGallery date={chapter.date} onOpenLightbox={onOpenLightbox} />

      <nav className="chapter-nav" aria-label="Chapter navigation">
        {previousChapter ? (
          <a className="chapter-link chapter-link-previous" href={`#${previousChapter.slug}`}>
            {`Previous: ${previousChapter.title}`}
          </a>
        ) : (
          <span className="chapter-link-spacer" aria-hidden="true" />
        )}

        {nextChapter ? (
          <a className="chapter-link chapter-link-next" href={`#${nextChapter.slug}`}>
            {`Continue: ${nextChapter.title}`}
          </a>
        ) : (
          <span className="chapter-link-spacer" aria-hidden="true" />
        )}
      </nav>
    </div>
  );
}
