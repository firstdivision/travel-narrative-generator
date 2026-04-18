import { useEffect, useRef, useState } from "react";
import { getBookmarkCookie, setBookmarkCookie } from "../lib/bookmark";

/**
 * Hook to manage bookmark banner prompt and chapter resumption.
 * Restores user's reading progress and allows resuming or dismissing.
 *
 * @param {Object} chapterData - Chapter data (can be null)
 * @param {Array} chapters - List of chapter objects
 * @param {Object} currentChapter - Current chapter being viewed (can be null)
 * @returns {Object} Bookmark state and control methods
 */
export function useBookmarkBanner(chapterData, chapters, currentChapter) {
  const [bookmarkBanner, setBookmarkBanner] = useState(null);
  const [bookmarkNextChapter, setBookmarkNextChapter] = useState(null);
  const [restoreScrollY, setRestoreScrollY] = useState(null);
  const [bookmarkPromptChecked, setBookmarkPromptChecked] = useState(false);
  const currentBookmarkRef = useRef({ slug: null, title: null });
  const isInitialLoadRef = useRef(true);

  // Update bookmark cookie when chapter changes (but NOT on initial load)
  // Skipping the initial load preserves any existing bookmark from a previous session
  useEffect(() => {
    if (!chapterData || !currentChapter) {
      return;
    }

    const { slug, title } = currentChapter;
    currentBookmarkRef.current = { slug, title };

    // Skip updating cookie on initial load to preserve existing bookmark
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }

    setBookmarkCookie(slug, title, 0);
  }, [chapterData, currentChapter]);

  // Check for saved bookmark on initial load
  useEffect(() => {
    if (!chapterData || bookmarkPromptChecked) {
      return;
    }

    const bookmark = getBookmarkCookie();
    const bookmarkExists = bookmark?.slug && chapters.some((chapter) => chapter.slug === bookmark.slug);

    // Only show bookmark banner if it's for a different chapter than the one currently displayed
    if (bookmarkExists && currentChapter && bookmark.slug !== currentChapter.slug) {
      const bookmarkIndex = chapters.findIndex((chapter) => chapter.slug === bookmark.slug);
      setBookmarkBanner(bookmark);
      setBookmarkNextChapter(chapters[bookmarkIndex + 1] ?? null);
    }

    setBookmarkPromptChecked(true);
  }, [bookmarkPromptChecked, chapterData, chapters, currentChapter]);

  return {
    bookmarkBanner,
    bookmarkNextChapter,
    restoreScrollY,
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
    setRestoreScrollY,
  };
}
