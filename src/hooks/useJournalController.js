import { useEffect, useRef, useState } from "react";
import {
  getBookmarkCookie,
  getChapterIndexFromHash,
  getHashSlug,
  scrollToChapterStart,
  setBookmarkCookie,
} from "../lib/bookmark";
import { loadChapterData } from "../lib/data";

export function useJournalController() {
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

  const chapters = chapterData?.chapters ?? [];
  const currentChapterIndex = chapters.length ? getChapterIndexFromHash(chapters) : 0;
  const currentChapter = chapters[currentChapterIndex] ?? null;

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
    const bookmarkExists = bookmark?.slug && chapters.some((chapter) => chapter.slug === bookmark.slug);

    if (bookmarkExists && bookmark.slug !== currentHash) {
      const bookmarkIndex = chapters.findIndex((chapter) => chapter.slug === bookmark.slug);
      setBookmarkBanner(bookmark);
      setBookmarkNextChapter(chapters[bookmarkIndex + 1] ?? null);
    }

    setBookmarkPromptChecked(true);
  }, [bookmarkPromptChecked, chapterData, chapters]);

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
        ? `${currentChapter.title} · Chapter ${currentChapterIndex + 1} of ${chapters.length}`
        : "Preparing chapter navigation...";

  return {
    error,
    loading,
    chapters,
    currentChapter,
    currentChapterIndex,
    currentSlug: currentChapter?.slug || "",
    heroTitle,
    subtitle,
    bookmarkBanner,
    bookmarkNextChapter,
    lightboxOpen,
    lightboxPhotos,
    lightboxIndex,
    jumpToChapter(targetSlug) {
      window.location.hash = targetSlug;
    },
    resumeBookmark() {
      if (!bookmarkBanner) {
        return;
      }

      setRestoreScrollY(bookmarkBanner.scrollY ?? null);
      setBookmarkBanner(null);
      window.location.hash = bookmarkBanner.slug;
    },
    dismissBookmark() {
      setBookmarkBanner(null);
    },
    clearBookmarkBanner() {
      setBookmarkBanner(null);
    },
    openLightbox(photos, startIndex) {
      setLightboxPhotos(photos);
      setLightboxIndex(startIndex);
      setLightboxOpen(true);
    },
    closeLightbox() {
      setLightboxOpen(false);
    },
    shiftLightbox(direction) {
      setLightboxIndex((currentIndex) => {
        if (!lightboxPhotos.length) {
          return 0;
        }

        return (currentIndex + direction + lightboxPhotos.length) % lightboxPhotos.length;
      });
    },
  };
}
