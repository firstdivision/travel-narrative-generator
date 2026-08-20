import { useState } from "react";
import { DAYS_VIEW_MODE_STORAGE_KEY } from "../lib/constants";

export const NARRATIVE_VIEW_MODE = "narrative";
export const DAYS_VIEW_MODE = "days";

function readStoredViewMode() {
  try {
    const stored = window.localStorage.getItem(DAYS_VIEW_MODE_STORAGE_KEY);
    return stored === DAYS_VIEW_MODE ? DAYS_VIEW_MODE : NARRATIVE_VIEW_MODE;
  } catch {
    return NARRATIVE_VIEW_MODE;
  }
}

/**
 * Hook for the reader's chosen content view mode (AI-assisted narrative vs. original journal),
 * persisted across chapters and reloads via localStorage.
 *
 * @returns {{ viewMode: string, setViewMode: Function }}
 */
export function useContentViewMode() {
  const [viewMode, setViewModeState] = useState(readStoredViewMode);

  const setViewMode = (nextViewMode) => {
    setViewModeState(nextViewMode);

    try {
      window.localStorage.setItem(DAYS_VIEW_MODE_STORAGE_KEY, nextViewMode);
    } catch {
      // localStorage may be unavailable (e.g. private browsing); in-memory state still works.
    }
  };

  return { viewMode, setViewMode };
}
