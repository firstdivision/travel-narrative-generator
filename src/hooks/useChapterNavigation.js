import { useEffect, useRef, useState } from "react";
import { getChapterIndexFromHash, getHashSlug } from "../lib/bookmark";

/**
 * Hook to manage chapter selection based on URL hash.
 * Syncs hash changes to current chapter and provides navigation methods.
 * Tracks whether scroll should happen on chapter change (due to hash navigation).
 *
 * @param {Object} chapterData - Chapter data from useChapterData (can be null)
 * @returns {Object} Chapter list, current chapter, and navigation methods
 */
export function useChapterNavigation(chapterData) {
  const [hashSlug, setHashSlug] = useState(getHashSlug);
  const shouldScrollRef = useRef(false);

  useEffect(() => {
    const handleHashChange = () => {
      shouldScrollRef.current = true;
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

  return {
    chapters,
    currentChapterIndex,
    currentChapter,
    currentSlug: currentChapter?.slug || "",
    shouldScroll: shouldScrollRef.current,
    clearShouldScroll() {
      shouldScrollRef.current = false;
    },
    jumpToChapter(targetSlug) {
      window.location.hash = targetSlug;
    },
  };
}
