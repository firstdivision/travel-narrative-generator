import { useEffect, useState } from "react";
import { loadChapterData } from "../lib/data";

/**
 * Hook to load chapter data from manifest and markdown files.
 * Handles fetching, error handling, and loading state.
 *
 * @returns {Object} Chapter data, error, and loading state
 */
export function useChapterData() {
  const [chapterData, setChapterData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

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

  return {
    chapterData,
    error,
    loading,
  };
}
