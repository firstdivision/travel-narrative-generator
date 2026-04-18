import { useEffect, useRef, useState } from "react";
import { getHashSlug } from "../lib/bookmark";
import { CHAPTER_REFRESH_INTERVAL } from "../lib/constants";
import {
  getManifestSignature,
  loadChapterContent,
  loadNarrativeManifest,
  loadNarrativeManifestMetadata,
} from "../lib/data";

const INVALID_CHAPTER_MESSAGE = "Opps! It looks like you asked for a chapter that doesn't exist...";

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

function getChapterIndexFromSlug(chapters, targetSlug) {
  if (!Array.isArray(chapters) || !chapters.length) {
    return -1;
  }

  if (!targetSlug) {
    return 0;
  }

  return chapters.findIndex((chapter) => chapter.slug === targetSlug);
}

function resolveChapterIndexOrThrow(chapters, targetSlug) {
  const chapterIndex = getChapterIndexFromSlug(chapters, targetSlug);

  if (chapterIndex >= 0) {
    return chapterIndex;
  }

  throw new Error(INVALID_CHAPTER_MESSAGE);
}

function buildChapterData(metadata, chapterIndex, chapterContent) {
  const chapters = metadata.chapters.map((chapter, index) => ({
    ...chapter,
    title: index === chapterIndex ? chapterContent.chapterTitle : chapter.title,
    tokens: index === chapterIndex ? chapterContent.contentTokens : null,
  }));

  return {
    documentTitle: chapterContent.documentTitle || "Travel Journal",
    chapters,
    manifestSignature: metadata.manifestSignature,
  };
}

function applyMetadataToCurrentChapter(previousData, metadata) {
  const currentSlug = getCurrentSlug(previousData);
  const nextChapterIndex = getChapterIndexFromSlug(metadata.chapters, currentSlug);

  if (nextChapterIndex < 0) {
    return {
      documentTitle: previousData?.documentTitle || "Travel Journal",
      chapters: metadata.chapters,
      manifestSignature: metadata.manifestSignature,
    };
  }

  const previousChapter = previousData?.chapters?.find((chapter) => chapter.slug === currentSlug);

  const chapters = metadata.chapters.map((chapter, index) => {
    if (index !== nextChapterIndex || !previousChapter) {
      return chapter;
    }

    return {
      ...chapter,
      title: previousChapter.title,
      tokens: previousChapter.tokens,
    };
  });

  return {
    documentTitle: previousData?.documentTitle || "Travel Journal",
    chapters,
    manifestSignature: metadata.manifestSignature,
  };
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
      chapter.hasPhotos !== nextChapter.hasPhotos ||
      chapter.displaySlug !== nextChapter.displaySlug
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
  const requestCounterRef = useRef(0);

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

    const loadChapterForSlug = async ({ metadata, slug, updateLoading }) => {
      const chapterIndex = resolveChapterIndexOrThrow(metadata.chapters, slug);
      const chapterEntry = metadata.chapters[chapterIndex];
      const requestId = requestCounterRef.current + 1;
      requestCounterRef.current = requestId;

      if (updateLoading) {
        setLoading(true);
      }

      try {
        const chapterContent = await loadChapterContent(chapterEntry.file, chapterEntry.title);

        if (!active || requestCounterRef.current !== requestId) {
          return;
        }

        const nextData = buildChapterData(metadata, chapterIndex, chapterContent);
        setChapterData(nextData);
        manifestSignatureRef.current = nextData.manifestSignature || metadata.manifestSignature || "";
        setError(null);
      } catch (loadError) {
        if (!active || requestCounterRef.current !== requestId) {
          return;
        }

        setError(loadError);
      } finally {
        if (active && requestCounterRef.current === requestId && updateLoading) {
          setLoading(false);
        }
      }
    };

    const loadInitialData = async () => {
      try {
        const metadata = await loadNarrativeManifestMetadata();
        const currentSlug = getHashSlug();
        await loadChapterForSlug({ metadata, slug: currentSlug, updateLoading: false });
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

    const handleHashChange = () => {
      const metadata = pendingDataRef.current || liveDataRef.current;

      if (!metadata) {
        return;
      }

      const currentSlug = getHashSlug();

      loadChapterForSlug({ metadata, slug: currentSlug, updateLoading: true });
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

        const latestMetadata = await loadNarrativeManifestMetadata();

        if (!active) {
          return;
        }

        manifestSignatureRef.current = latestMetadata.manifestSignature || nextManifestSignature;

        const baselineData = pendingDataRef.current || liveDataRef.current;

        if (!baselineData) {
          const currentSlug = getHashSlug();
          await loadChapterForSlug({ metadata: latestMetadata, slug: currentSlug, updateLoading: false });
          return;
        }

        const mergedLatestData = applyMetadataToCurrentChapter(baselineData, latestMetadata);
        const diff = summarizeChapterChanges(baselineData, mergedLatestData);

        if (!diff.hasChanges) {
          return;
        }

        if (diff.currentChapterChanged) {
          setPendingChapterData(mergedLatestData);
          setUpdateNotice({
            type: "current-chapter-updated",
            chapterTitle: diff.currentChapterTitle,
          });
          return;
        }

        setChapterData(mergedLatestData);
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
    window.addEventListener("hashchange", handleHashChange);
    const intervalId = window.setInterval(checkForUpdates, CHAPTER_REFRESH_INTERVAL);

    return () => {
      active = false;
      window.removeEventListener("hashchange", handleHashChange);
      window.clearInterval(intervalId);
    };
  }, []);

  async function applyPendingUpdate() {
    const pendingData = pendingDataRef.current;

    if (!pendingData) {
      setUpdateNotice(null);
      return;
    }

    const currentSlug = getHashSlug();

    try {
      setLoading(true);
      const chapterIndex = resolveChapterIndexOrThrow(pendingData.chapters, currentSlug);
      const chapterEntry = pendingData.chapters[chapterIndex];
      const chapterContent = await loadChapterContent(chapterEntry.file, chapterEntry.title);
      const nextData = buildChapterData(pendingData, chapterIndex, chapterContent);

      setChapterData(nextData);
      setPendingChapterData(null);
      setError(null);
    } catch (loadError) {
      setError(loadError);
    } finally {
      setLoading(false);
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
