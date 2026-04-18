import { useEffect, useRef, useState } from "react";
import { getHashSlug } from "../lib/bookmark";
import { CHAPTER_REFRESH_INTERVAL } from "../lib/constants";
import { getManifestSignature, loadChapterData, loadNarrativeManifest } from "../lib/data";

function getChapterKey(chapter) {
  return chapter?.date || chapter?.slug || "";
}

function createChapterIndex(chapters) {
  const index = new Map();

  for (const chapter of chapters) {
    const key = getChapterKey(chapter);

    if (!key) {
      continue;
    }

    index.set(key, chapter);
  }

  return index;
}

function getCurrentSlug(chapterData) {
  const hashSlug = getHashSlug();

  if (hashSlug) {
    return hashSlug;
  }

  return chapterData?.chapters?.[0]?.slug || "";
}

function summarizeChapterChanges(previousData, nextData) {
  const previousChapters = previousData?.chapters ?? [];
  const nextChapters = nextData?.chapters ?? [];
  const previousChapterIndex = createChapterIndex(previousChapters);
  const nextChapterIndex = createChapterIndex(nextChapters);

  let newChapterCount = 0;

  for (const chapter of nextChapters) {
    const key = getChapterKey(chapter);

    if (key && !previousChapterIndex.has(key)) {
      newChapterCount += 1;
    }
  }

  const orderChanged =
    previousChapters.length !== nextChapters.length ||
    previousChapters.some((chapter, index) => {
      const nextChapter = nextChapters[index];
      return getChapterKey(chapter) !== getChapterKey(nextChapter);
    });

  let contentChanged = false;

  for (const chapter of previousChapters) {
    const key = getChapterKey(chapter);

    if (!key || !nextChapterIndex.has(key)) {
      contentChanged = true;
      break;
    }

    const nextChapter = nextChapterIndex.get(key);

    if (
      chapter.contentHash !== nextChapter.contentHash ||
      chapter.hasPhotos !== nextChapter.hasPhotos
    ) {
      contentChanged = true;
      break;
    }
  }

  const currentSlug = getCurrentSlug(previousData);
  const currentChapter = previousChapters.find((chapter) => chapter.slug === currentSlug);
  const currentChapterKey = currentChapter ? getChapterKey(currentChapter) : "";
  const nextCurrentChapter = currentChapterKey ? nextChapterIndex.get(currentChapterKey) : null;
  const currentChapterChanged =
    Boolean(currentChapter) &&
    (!nextCurrentChapter ||
      currentChapter.contentHash !== nextCurrentChapter.contentHash ||
      currentChapter.hasPhotos !== nextCurrentChapter.hasPhotos);

  return {
    hasChanges: orderChanged || contentChanged,
    currentChapterChanged,
    currentChapterTitle: currentChapter?.title || "this chapter",
    newChapterCount,
  };
}

/**
 * Hook to load chapter data from manifest and markdown files.
 * Handles fetching, background refresh polling, and update notifications.
 *
 * @returns {Object} Chapter data, update notifications, and loading state
 */
export function useChapterData() {
  const [chapterData, setChapterData] = useState(null);
  const [pendingChapterData, setPendingChapterData] = useState(null);
  const [updateNotice, setUpdateNotice] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const liveDataRef = useRef(null);
  const pendingDataRef = useRef(null);
  const loadingRef = useRef(true);
  const manifestSignatureRef = useRef("");

  useEffect(() => {
    liveDataRef.current = chapterData;
  }, [chapterData]);

  useEffect(() => {
    pendingDataRef.current = pendingChapterData;
  }, [pendingChapterData]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    let active = true;

    const loadInitialData = async () => {
      try {
        const data = await loadChapterData();

        if (!active) {
          return;
        }

        setChapterData(data);
        manifestSignatureRef.current = data.manifestSignature || "";
        setError(null);
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(loadError);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    const checkForUpdates = async () => {
      if (!active || loadingRef.current) {
        return;
      }

      try {
        const manifest = await loadNarrativeManifest();
        const nextManifestSignature = getManifestSignature(manifest);

        if (!nextManifestSignature || nextManifestSignature === manifestSignatureRef.current) {
          return;
        }

        const latestData = await loadChapterData();

        if (!active) {
          return;
        }

        manifestSignatureRef.current = latestData.manifestSignature || nextManifestSignature;

        const baselineData = pendingDataRef.current || liveDataRef.current;

        if (!baselineData) {
          setChapterData(latestData);
          setError(null);
          return;
        }

        const diff = summarizeChapterChanges(baselineData, latestData);

        if (!diff.hasChanges) {
          return;
        }

        if (diff.currentChapterChanged) {
          setPendingChapterData(latestData);
          setUpdateNotice({
            type: "current-chapter-updated",
            chapterTitle: diff.currentChapterTitle,
          });
          return;
        }

        setChapterData(latestData);
        setPendingChapterData(null);
        setError(null);

        setUpdateNotice(
          diff.newChapterCount > 0
            ? {
                type: "new-chapters-added",
                count: diff.newChapterCount,
              }
            : {
                type: "chapters-updated",
              }
        );
      } catch {
        // Ignore polling errors and keep displaying the last successful content.
      }
    };

    loadInitialData();
    const intervalId = window.setInterval(checkForUpdates, CHAPTER_REFRESH_INTERVAL);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  function applyPendingUpdate() {
    if (pendingDataRef.current) {
      setChapterData(pendingDataRef.current);
      setPendingChapterData(null);
    }

    setUpdateNotice(null);
  }

  function dismissUpdateNotice() {
    setUpdateNotice(null);
  }

  return {
    chapterData,
    error,
    loading,
    updateNotice,
    applyPendingUpdate,
    dismissUpdateNotice,
  };
}
