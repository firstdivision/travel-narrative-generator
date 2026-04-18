import { renderHook, act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useBookmarkBanner } from "../useBookmarkBanner";
import { getBookmarkCookie, setBookmarkCookie } from "../../lib/bookmark";

vi.mock("../../lib/bookmark", () => ({
  getBookmarkCookie: vi.fn(),
  setBookmarkCookie: vi.fn(),
}));

describe("useBookmarkBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes with no banner", () => {
    getBookmarkCookie.mockReturnValue(null);

    const { result } = renderHook(() =>
      useBookmarkBanner(null, [], null)
    );

    expect(result.current.bookmarkBanner).toBeNull();
    expect(result.current.bookmarkNextChapter).toBeNull();
  });

  it("does not show banner when no saved bookmark exists", async () => {
    getBookmarkCookie.mockReturnValue(null);

    const chapters = [
      { title: "Ch1", slug: "ch1" },
      { title: "Ch2", slug: "ch2" },
    ];

    const { result } = renderHook(() =>
      useBookmarkBanner(
        { documentTitle: "Test", chapters },
        chapters,
        chapters[0]
      )
    );

    await waitFor(() => {
      expect(result.current.bookmarkBanner).toBeNull();
    });
  });

  it("does not show banner when bookmark is for current chapter", async () => {
    getBookmarkCookie.mockReturnValue({
      slug: "ch1",
      title: "Chapter 1",
      scrollY: 100,
    });

    const chapters = [
      { title: "Chapter 1", slug: "ch1" },
      { title: "Chapter 2", slug: "ch2" },
    ];

    const { result } = renderHook(() =>
      useBookmarkBanner(
        { documentTitle: "Test", chapters },
        chapters,
        chapters[0]
      )
    );

    await waitFor(() => {
      expect(result.current.bookmarkBanner).toBeNull();
    });
  });

  it("shows banner when bookmark is for different chapter", async () => {
    const savedBookmark = {
      slug: "ch2",
      title: "Chapter 2",
      scrollY: 50,
    };

    getBookmarkCookie.mockReturnValue(savedBookmark);

    const chapters = [
      { title: "Chapter 1", slug: "ch1" },
      { title: "Chapter 2", slug: "ch2" },
      { title: "Chapter 3", slug: "ch3" },
    ];

    const { result } = renderHook(() =>
      useBookmarkBanner(
        { documentTitle: "Test", chapters },
        chapters,
        chapters[0]
      )
    );

    await waitFor(() => {
      expect(result.current.bookmarkBanner).toEqual(savedBookmark);
    });

    // Should set next chapter too
    expect(result.current.bookmarkNextChapter).toEqual(chapters[2]);
  });

  it("resumes bookmark and navigates to saved chapter", async () => {
    const savedBookmark = {
      slug: "ch2",
      title: "Chapter 2",
      scrollY: 100,
    };

    getBookmarkCookie.mockReturnValue(savedBookmark);

    const chapters = [
      { title: "Chapter 1", slug: "ch1" },
      { title: "Chapter 2", slug: "ch2" },
    ];

    const { result } = renderHook(() =>
      useBookmarkBanner(
        { documentTitle: "Test", chapters },
        chapters,
        chapters[0]
      )
    );

    await waitFor(() => {
      expect(result.current.bookmarkBanner).not.toBeNull();
    });

    const initialHash = window.location.hash;

    act(() => {
      result.current.resumeBookmark();
    });

    // Banner should be cleared
    expect(result.current.bookmarkBanner).toBeNull();
    // Hash should be updated to saved chapter
    expect(window.location.hash).toBe("#ch2");
    // Restore scroll position should be set
    expect(result.current.restoreScrollY).toBe(100);
  });

  it("dismisses bookmark banner", async () => {
    const savedBookmark = {
      slug: "ch2",
      title: "Chapter 2",
      scrollY: 50,
    };

    getBookmarkCookie.mockReturnValue(savedBookmark);

    const chapters = [
      { title: "Chapter 1", slug: "ch1" },
      { title: "Chapter 2", slug: "ch2" },
    ];

    const { result } = renderHook(() =>
      useBookmarkBanner(
        { documentTitle: "Test", chapters },
        chapters,
        chapters[0]
      )
    );

    await waitFor(() => {
      expect(result.current.bookmarkBanner).not.toBeNull();
    });

    act(() => {
      result.current.dismissBookmark();
    });

    expect(result.current.bookmarkBanner).toBeNull();
  });

  it("does not update bookmark on initial load", () => {
    getBookmarkCookie.mockReturnValue(null);

    const chapters = [
      { title: "Chapter 1", slug: "ch1" },
      { title: "Chapter 2", slug: "ch2" },
    ];

    renderHook(() =>
      useBookmarkBanner(
        { documentTitle: "Test", chapters },
        chapters,
        chapters[0]
      )
    );

    // setBookmarkCookie should NOT be called on initial load
    expect(setBookmarkCookie).not.toHaveBeenCalled();
  });

  it("updates bookmark when navigating to new chapter", async () => {
    getBookmarkCookie.mockReturnValue(null);

    const chapters = [
      { title: "Chapter 1", slug: "ch1", tokens: [] },
      { title: "Chapter 2", slug: "ch2", tokens: [] },
    ];

    const { rerender } = renderHook(
      ({ currentChapter }) =>
        useBookmarkBanner(
          { documentTitle: "Test", chapters },
          chapters,
          currentChapter
        ),
      {
        initialProps: { currentChapter: chapters[0] },
      }
    );

    // Navigate to chapter 2
    rerender({ currentChapter: chapters[1] });

    await waitFor(() => {
      // After navigating to a new chapter, bookmark should be updated
      expect(setBookmarkCookie).toHaveBeenCalledWith(
        "ch2",
        "Chapter 2",
        0
      );
    });
  });
});
