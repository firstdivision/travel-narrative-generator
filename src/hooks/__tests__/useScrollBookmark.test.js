import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { afterEach } from "vitest";
import { useScrollBookmark } from "../useScrollBookmark";
import { setBookmarkCookie } from "../../lib/bookmark";

vi.mock("../../lib/bookmark", () => ({
  setBookmarkCookie: vi.fn(),
}));

describe("useScrollBookmark", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("saves scroll position on scroll event", () => {
    const currentChapter = { title: "Chapter 1", slug: "ch1" };

    const { unmount } = renderHook(() => useScrollBookmark(currentChapter));

    // Simulate scroll
    window.scrollY = 150;
    window.dispatchEvent(new Event("scroll"));

    // Advance timers to trigger debounced save
    vi.advanceTimersByTime(500);

    expect(setBookmarkCookie).toHaveBeenCalledWith("ch1", "Chapter 1", 150);
    
    unmount();
  });

  it("debounces scroll events", () => {
    const currentChapter = { title: "Chapter 1", slug: "ch1" };

    const { unmount } = renderHook(() => useScrollBookmark(currentChapter));

    // Multiple scroll events
    window.scrollY = 100;
    window.dispatchEvent(new Event("scroll"));
    window.scrollY = 150;
    window.dispatchEvent(new Event("scroll"));
    window.scrollY = 200;
    window.dispatchEvent(new Event("scroll"));

    // Advance less than debounce time
    vi.advanceTimersByTime(300);

    // Should not have called yet
    expect(setBookmarkCookie).not.toHaveBeenCalled();

    // Advance to debounce time
    vi.advanceTimersByTime(200);

    // Should have called once with final position
    expect(setBookmarkCookie).toHaveBeenCalledTimes(1);
    expect(setBookmarkCookie).toHaveBeenCalledWith("ch1", "Chapter 1", 200);
    
    unmount();
  });

  it("does not save when chapter is null", () => {
    const { unmount } = renderHook(() => useScrollBookmark(null));

    window.scrollY = 100;
    window.dispatchEvent(new Event("scroll"));

    vi.advanceTimersByTime(500);

    expect(setBookmarkCookie).not.toHaveBeenCalled();
    
    unmount();
  });

  it("cleans up event listener on unmount", () => {
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
    const currentChapter = { title: "Chapter 1", slug: "ch1" };

    const { unmount } = renderHook(() => useScrollBookmark(currentChapter));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "scroll",
      expect.any(Function)
    );

    removeEventListenerSpy.mockRestore();
  });

  it("cleanup clears timeout on unmount", () => {
    const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");
    const currentChapter = { title: "Chapter 1", slug: "ch1" };

    const { unmount } = renderHook(() => useScrollBookmark(currentChapter));

    // Trigger a scroll to start a timeout
    window.scrollY = 100;
    window.dispatchEvent(new Event("scroll"));

    // Unmount should trigger cleanup
    unmount();

    // Verify cleanup was called (clearTimeout should be called)
    expect(clearTimeoutSpy).toHaveBeenCalled();

    clearTimeoutSpy.mockRestore();
  });

  it("uses current chapter from ref when saving scroll", () => {
    const chapter1 = { title: "Chapter 1", slug: "ch1" };
    const chapter2 = { title: "Chapter 2", slug: "ch2" };

    const { rerender, unmount } = renderHook(
      ({ chapter }) => useScrollBookmark(chapter),
      { initialProps: { chapter: chapter1 } }
    );

    window.scrollY = 100;
    window.dispatchEvent(new Event("scroll"));
    vi.advanceTimersByTime(500);

    expect(setBookmarkCookie).toHaveBeenCalledWith("ch1", "Chapter 1", 100);

    vi.clearAllMocks();

    // Update to chapter 2
    rerender({ chapter: chapter2 });

    window.scrollY = 200;
    window.dispatchEvent(new Event("scroll"));
    vi.advanceTimersByTime(500);

    expect(setBookmarkCookie).toHaveBeenCalledWith("ch2", "Chapter 2", 200);
    
    unmount();
  });

  it("updates bookmark ref when chapter changes", () => {
    const chapter1 = { title: "Chapter 1", slug: "ch1" };
    const chapter2 = { title: "Chapter 2", slug: "ch2" };

    const { rerender, unmount } = renderHook(
      ({ chapter }) => useScrollBookmark(chapter),
      { initialProps: { chapter: chapter1 } }
    );

    window.scrollY = 100;
    window.dispatchEvent(new Event("scroll"));
    vi.advanceTimersByTime(500);

    expect(setBookmarkCookie).toHaveBeenCalledWith("ch1", "Chapter 1", 100);
    vi.clearAllMocks();

    // Change to chapter 2 - ref should update
    rerender({ chapter: chapter2 });

    window.scrollY = 200;
    window.dispatchEvent(new Event("scroll"));
    vi.advanceTimersByTime(500);

    // Should use the new chapter
    expect(setBookmarkCookie).toHaveBeenCalledWith("ch2", "Chapter 2", 200);
    
    unmount();
  });
});
