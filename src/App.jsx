import { BookmarkBanner } from "./components/BookmarkBanner";
import { ChapterView } from "./components/ChapterView";
import { HeroPanel } from "./components/HeroPanel";
import { Lightbox } from "./components/Lightbox";
import { useJournalController } from "./hooks/useJournalController";

export function App() {
  const {
    error,
    loading,
    chapters,
    currentChapter,
    currentChapterIndex,
    currentSlug,
    heroTitle,
    subtitle,
    bookmarkBanner,
    bookmarkNextChapter,
    lightboxOpen,
    lightboxPhotos,
    lightboxIndex,
    jumpToChapter,
    resumeBookmark,
    dismissBookmark,
    clearBookmarkBanner,
    openLightbox,
    closeLightbox,
    shiftLightbox,
  } = useJournalController();

  return (
    <main className="page-shell">
      <HeroPanel
        documentTitle={heroTitle}
        subtitle={subtitle}
        chapters={chapters}
        currentSlug={currentSlug}
        loading={loading}
        onJumpToChapter={jumpToChapter}
      />

      <section className="content-layout">
        {bookmarkBanner && (
          <BookmarkBanner
            bookmark={bookmarkBanner}
            nextChapter={bookmarkNextChapter}
            onResume={resumeBookmark}
            onDismiss={dismissBookmark}
            onReadNext={clearBookmarkBanner}
          />
        )}

        <article className="journal-card" aria-live="polite">
          {error ? (
            <>
              <p className="status error">Unable to load the travel narrative.</p>
              <p className="error-detail">{error.message}</p>
            </>
          ) : loading || !currentChapter ? (
            <p className="status">Loading journal entry...</p>
          ) : (
            <ChapterView
              chapter={currentChapter}
              chapterIndex={currentChapterIndex}
              chapters={chapters}
              onOpenLightbox={openLightbox}
            />
          )}
        </article>
      </section>

      <Lightbox
        isOpen={lightboxOpen}
        photos={lightboxPhotos}
        index={lightboxIndex}
        onClose={closeLightbox}
        onShift={shiftLightbox}
      />
    </main>
  );
}
