import { useMemo } from "react";
import { renderChapterHtml } from "../lib/markdown";
import { DAYS_VIEW_MODE, NARRATIVE_VIEW_MODE, useContentViewMode } from "../hooks/useContentViewMode";
import { PhotoGallery } from "./PhotoGallery";

export function ChapterView({ chapter, chapterIndex, chapters, onOpenLightbox, onJumpToChapter }) {
  const { viewMode, setViewMode } = useContentViewMode();
  const hasDaysContent = Boolean(chapter.daysFile) && Array.isArray(chapter.daysTokens);
  // Fall back to narrative if the reader is in "days" mode on a chapter without one.
  const activeViewMode = hasDaysContent && viewMode === DAYS_VIEW_MODE ? DAYS_VIEW_MODE : NARRATIVE_VIEW_MODE;
  const activeTokens = activeViewMode === DAYS_VIEW_MODE ? chapter.daysTokens : chapter.tokens;
  const chapterHtml = useMemo(() => renderChapterHtml(activeTokens), [activeTokens]);
  const totalChapters = chapters.length;
  const previousChapter = chapters[chapterIndex - 1] ?? null;
  const nextChapter = chapters[chapterIndex + 1] ?? null;

  return (
    <div className="chapter-shell">
      <header className="chapter-header">
        <p className="chapter-kicker">{`Chapter ${chapterIndex + 1} of ${totalChapters}`}</p>
        <h2 className="chapter-title">{chapter.title}</h2>
        {hasDaysContent && (
          <div className="content-view-toggle" role="group" aria-label="Content view">
            <button
              className={`content-view-toggle-button${activeViewMode === NARRATIVE_VIEW_MODE ? " is-active" : ""}`}
              type="button"
              onClick={() => setViewMode(NARRATIVE_VIEW_MODE)}
            >
              AI-Assisted
            </button>
            <button
              className={`content-view-toggle-button${activeViewMode === DAYS_VIEW_MODE ? " is-active" : ""}`}
              type="button"
              onClick={() => setViewMode(DAYS_VIEW_MODE)}
            >
              Journal
            </button>
          </div>
        )}
      </header>

      <div className="journal-content" dangerouslySetInnerHTML={{ __html: chapterHtml }} />


      <PhotoGallery
        date={chapter.date}
        hasPhotos={chapter.hasPhotos}
        onOpenLightbox={onOpenLightbox}
      />

      <nav className="chapter-nav" aria-label="Chapter navigation">
        {previousChapter ? (
          <a
            className="chapter-link chapter-link-previous"
            href={`#${previousChapter.slug}`}
            onClick={(event) => {
              event.preventDefault();
              onJumpToChapter(previousChapter.slug);
            }}
          >
            {`Previous: ${previousChapter.title}`}
          </a>
        ) : (
          <span className="chapter-link-spacer" aria-hidden="true" />
        )}

        {nextChapter ? (
          <a
            className="chapter-link chapter-link-next"
            href={`#${nextChapter.slug}`}
            onClick={(event) => {
              event.preventDefault();
              onJumpToChapter(nextChapter.slug);
            }}
          >
            {`Continue: ${nextChapter.title}`}
          </a>
        ) : (
          <span className="chapter-link-spacer" aria-hidden="true" />
        )}
      </nav>
    </div>
  );
}
