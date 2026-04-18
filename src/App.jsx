import { BookmarkBanner } from "./components/BookmarkBanner";
import { ChapterView } from "./components/ChapterView";
import { ContentUpdateBanner } from "./components/ContentUpdateBanner";
import { HeroPanel } from "./components/HeroPanel";
import { Lightbox } from "./components/Lightbox";
import { useChapterData } from "./hooks/useChapterData";
import { useChapterNavigation } from "./hooks/useChapterNavigation";
import { useBookmarkBanner } from "./hooks/useBookmarkBanner";
import { useLightbox } from "./hooks/useLightbox";
import { useScrollBookmark } from "./hooks/useScrollBookmark";
import { useDocumentTitle } from "./hooks/useDocumentTitle";

export function App() {
  // Load chapter data
  const { chapterData, error, loading, updateNotice, applyPendingUpdate, dismissUpdateNotice } = useChapterData();

  // Navigate chapters via hash
  const nav = useChapterNavigation(chapterData);
  const { chapters, currentChapterIndex, currentChapter, currentSlug, jumpToChapter } = nav;

  // Manage bookmark prompt and restoration
  const bookmark = useBookmarkBanner(chapterData, chapters, currentChapter);
  const { bookmarkBanner, bookmarkNextChapter, restoreScrollY, resumeBookmark, dismissBookmark, clearBookmarkBanner, setRestoreScrollY } = bookmark;

  const handleJumpToChapter = (targetSlug) => {
    clearBookmarkBanner();
    jumpToChapter(targetSlug);
  };

  // Manage lightbox state
  const { lightboxOpen, lightboxPhotos, lightboxIndex, openLightbox, closeLightbox, shiftLightbox } = useLightbox();

  // Side effects
  useScrollBookmark(currentChapter);
  useDocumentTitle({
    chapterData,
    currentChapter,
    error,
    shouldScroll: nav.shouldScroll,
    restoreScrollY,
    onScrollComplete: () => {
      nav.clearShouldScroll();
      setRestoreScrollY(null);
    },
  });

  // Derived display state
  const heroTitle = error
    ? "Travel journal unavailable"
    : loading
      ? "Loading travel journal..."
      : chapterData?.documentTitle || "Travel Journal";

  const subtitle = error
    ? "The chapter view could not be prepared."
    : loading
      ? "Preparing chapter navigation..."
      : currentChapter
        ? `${currentChapter.title} · Chapter ${currentChapterIndex + 1} of ${chapters.length}`
        : "Preparing chapter navigation...";

  return (
    <main className="page-shell">
      <HeroPanel
        documentTitle={heroTitle}
        subtitle={subtitle}
        chapters={chapters}
        currentSlug={currentSlug}
        loading={loading}
        onJumpToChapter={handleJumpToChapter}
      />

      <section className="content-layout">
        {updateNotice && (
          <ContentUpdateBanner
            notice={updateNotice}
            onReload={applyPendingUpdate}
            onDismiss={dismissUpdateNotice}
          />
        )}

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
