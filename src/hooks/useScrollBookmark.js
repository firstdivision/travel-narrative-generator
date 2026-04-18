import { useEffect, useRef } from "react";
import { setBookmarkCookie } from "../lib/bookmark";
import { SCROLL_SAVE_DEBOUNCE } from "../lib/constants";

/**
 * Side effect hook to save scroll position to bookmark cookie.
 * Debounces to avoid excessive cookie writes while scrolling.
 *
 * @param {Object} currentChapter - Current chapter being viewed (can be null)
 */
export function useScrollBookmark(currentChapter) {
  const currentBookmarkRef = useRef({ slug: null, title: null });
  const scrollSaveTimerRef = useRef(null);

  // Update bookmark ref when chapter changes
  useEffect(() => {
    if (!currentChapter) {
      return;
    }

    const { slug, title } = currentChapter;
    currentBookmarkRef.current = { slug, title };
  }, [currentChapter]);

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
      }, SCROLL_SAVE_DEBOUNCE);
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);

      if (scrollSaveTimerRef.current) {
        clearTimeout(scrollSaveTimerRef.current);
      }
    };
  }, []);
}
