import { useEffect, useRef } from "react";
import { scrollToChapterStart } from "../lib/bookmark";

/**
 * Side effect hook to handle scroll restoration and page title updates.
 * Syncs browser tab title with current chapter.
 * Scrolls to chapter on hash change with optional scroll position restoration.
 *
 * @param {Object} state - State object containing various navigation and scroll state
 */
export function useDocumentTitle(state) {
  const { chapterData, currentChapter, error, shouldScroll, restoreScrollY, onScrollComplete } = state;
  const lastNavigatedSlugRef = useRef("");

  // Update document title
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

  // Handle scroll restoration on navigation
  useEffect(() => {
    if (!chapterData || !currentChapter || !shouldScroll) {
      const currentSlug = currentChapter?.slug || "";

      if (!chapterData || !currentChapter || !currentSlug) {
        return;
      }

      if (currentSlug === lastNavigatedSlugRef.current) {
        return;
      }

      // Fallback for chapter-link hash navigations when shouldScroll is not observed.
      scrollToChapterStart();
      lastNavigatedSlugRef.current = currentSlug;
      return;
    }

    const currentSlug = currentChapter?.slug || "";

    if (restoreScrollY != null) {
      const targetY = restoreScrollY;
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: targetY, behavior: "smooth" });
      });
    } else {
      scrollToChapterStart();
    }

    if (typeof onScrollComplete === "function") {
      onScrollComplete();
    }

    if (currentSlug) {
      lastNavigatedSlugRef.current = currentSlug;
    }
  }, [chapterData, currentChapter, shouldScroll, restoreScrollY]);
}
