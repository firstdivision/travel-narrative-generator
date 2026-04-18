import { useEffect, useMemo, useRef, useState } from "react";
import { BookmarkBanner } from "./components/BookmarkBanner";
import { ChapterView } from "./components/ChapterView";
import { HeroPanel } from "./components/HeroPanel";
import { Lightbox } from "./components/Lightbox";
import {
  getBookmarkCookie,
  getChapterIndexFromHash,
  getHashSlug,
  scrollToChapterStart,
  setBookmarkCookie,
} from "./lib/bookmark";
import { loadChapterData } from "./lib/data";

export function App() {
  const [chapterData, setChapterData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hashSlug, setHashSlug] = useState(getHashSlug);

  const [bookmarkBanner, setBookmarkBanner] = useState(null);
  const [bookmarkNextChapter, setBookmarkNextChapter] = useState(null);
  const [restoreScrollY, setRestoreScrollY] = useState(null);
  const [bookmarkPromptChecked, setBookmarkPromptChecked] = useState(false);

  const [lightboxPhotos, setLightboxPhotos] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const shouldScrollToChapterRef = useRef(false);
  const currentBookmarkRef = useRef({ slug: null, title: null });
  const scrollSaveTimerRef = useRef(null);

  useEffect(() => {
    let active = true;

    loadChapterData()
      .then((data) => {
        if (!active) {
          return;
        }

        setChapterData(data);
        setLoading(false);
      })
      .catch((loadError) => {
        if (!active) {
          return;
        }

        setError(loadError);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      shouldScrollToChapterRef.current = true;
      setHashSlug(getHashSlug());
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  const currentChapterIndex = useMemo(() => {
    if (!chapterData?.chapters?.length) {
      return 0;
    }

    return getChapterIndexFromHash(chapterData.chapters);
  }, [chapterData, hashSlug]);

  const currentChapter = chapterData?.chapters?.[currentChapterIndex] ?? null;

  useEffect(() => {
    if (!chapterData || !currentChapter) {
      return;
    }

    const { slug, title } = currentChapter;
    currentBookmarkRef.current = { slug, title };
    setBookmarkCookie(slug, title, 0);
  }, [chapterData, currentChapter]);

  useEffect(() => {
    if (!chapterData || bookmarkPromptChecked) {
      return;
    }

    const bookmark = getBookmarkCookie();
    const currentHash = getHashSlug();
    const bookmarkExists =
      bookmark?.slug && chapterData.chapters.some((chapter) => chapter.slug === bookmark.slug);

    if (bookmarkExists && bookmark.slug !== currentHash) {
      const bookmarkIndex = chapterData.chapters.findIndex((chapter) => chapter.slug === bookmark.slug);
      setBookmarkBanner(bookmark);
      setBookmarkNextChapter(chapterData.chapters[bookmarkIndex + 1] ?? null);
    }

    setBookmarkPromptChecked(true);
  }, [chapterData, bookmarkPromptChecked]);

  useEffect(() => {
    const onScroll = () => {
      const { slug, title } = currentBookmarkRef.current;

      if (!slug || !title) {
        return;
      }

      if (scrollSaveTimerRef.current) {
        clearTimeout(scrollSaveTimerRef.current);
      }

      scrollSaveTimerRef.current = window.setTimeout(() => {
        setBookmarkCookie(slug, title, Math.round(window.scrollY));
      }, 500);
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);

      if (scrollSaveTimerRef.current) {
        clearTimeout(scrollSaveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!chapterData || !currentChapter || !shouldScrollToChapterRef.current) {
      return;
    }

    shouldScrollToChapterRef.current = false;

    if (restoreScrollY != null) {
      const targetY = restoreScrollY;
      setRestoreScrollY(null);
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: targetY, behavior: "smooth" });
      });
      return;
    }

    scrollToChapterStart();
  }, [chapterData, currentChapter, restoreScrollY]);

  useEffect(() => {
    if (error) {
      document.title = "Travel journal unavailable";
      return;
    }

    if (!chapterData || !currentChapter) {
      document.title = "Travel Journal";
      return;
    }

    document.title = `${currentChapter.title} | ${chapterData.documentTitle}`;
  }, [chapterData, currentChapter, error]);

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
        ? `${currentChapter.title} · Chapter ${currentChapterIndex + 1} of ${chapterData.chapters.length}`
        : "Preparing chapter navigation...";

  const currentSlug = currentChapter?.slug || "";

  return (
    <main className="page-shell">
      <HeroPanel
        documentTitle={heroTitle}
        subtitle={subtitle}
        chapters={chapterData?.chapters ?? []}
        currentSlug={currentSlug}
        loading={loading}
        onJumpToChapter={(targetSlug) => {
          window.location.hash = targetSlug;
        }}
      />

      <section className="content-layout">
        {bookmarkBanner && (
          <BookmarkBanner
            bookmark={bookmarkBanner}
            nextChapter={bookmarkNextChapter}
            onResume={() => {
              setRestoreScrollY(bookmarkBanner.scrollY ?? null);
              setBookmarkBanner(null);
              window.location.hash = bookmarkBanner.slug;
            }}
            onDismiss={() => {
              setBookmarkBanner(null);
            }}
            onReadNext={() => {
              setBookmarkBanner(null);
            }}
          />
        )}

        <article className="journal-card" aria-live="polite">
          {error ? (
            <>
              <p className="status error">Unable to load the travel narrative.</p>
              <p className="error-detail">{error.message}</p>
            </>
          ) : loading || !chapterData || !currentChapter ? (
            <p className="status">Loading journal entry...</p>
          ) : (
            <ChapterView
              chapter={currentChapter}
              chapterIndex={currentChapterIndex}
              chapters={chapterData.chapters}
              onOpenLightbox={(photos, startIndex) => {
                setLightboxPhotos(photos);
                setLightboxIndex(startIndex);
                setLightboxOpen(true);
              }}
            />
          )}
        </article>
      </section>

      <Lightbox
        isOpen={lightboxOpen}
        photos={lightboxPhotos}
        index={lightboxIndex}
        onClose={() => {
          setLightboxOpen(false);
        }}
        onShift={(direction) => {
          setLightboxIndex((currentIndex) => {
            if (!lightboxPhotos.length) {
              return 0;
            }

            return (currentIndex + direction + lightboxPhotos.length) % lightboxPhotos.length;
          });
        }}
      />
    </main>
  );
}
