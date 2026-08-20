import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { DAYS_VIEW_MODE, NARRATIVE_VIEW_MODE, useContentViewMode } from "../useContentViewMode";
import { DAYS_VIEW_MODE_STORAGE_KEY } from "../../lib/constants";

describe("useContentViewMode", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("defaults to narrative view mode", () => {
    const { result } = renderHook(() => useContentViewMode());

    expect(result.current.viewMode).toBe(NARRATIVE_VIEW_MODE);
  });

  it("switches to days view mode and persists it", () => {
    const { result } = renderHook(() => useContentViewMode());

    act(() => {
      result.current.setViewMode(DAYS_VIEW_MODE);
    });

    expect(result.current.viewMode).toBe(DAYS_VIEW_MODE);
    expect(window.localStorage.getItem(DAYS_VIEW_MODE_STORAGE_KEY)).toBe(DAYS_VIEW_MODE);
  });

  it("restores the persisted view mode on mount", () => {
    window.localStorage.setItem(DAYS_VIEW_MODE_STORAGE_KEY, DAYS_VIEW_MODE);

    const { result } = renderHook(() => useContentViewMode());

    expect(result.current.viewMode).toBe(DAYS_VIEW_MODE);
  });

  it("ignores an invalid stored value and falls back to narrative", () => {
    window.localStorage.setItem(DAYS_VIEW_MODE_STORAGE_KEY, "bogus");

    const { result } = renderHook(() => useContentViewMode());

    expect(result.current.viewMode).toBe(NARRATIVE_VIEW_MODE);
  });
});
