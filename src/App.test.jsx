import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { marked } from "marked";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { loadChapterData, loadPhotosForDate } from "./lib/data";
import { getBookmarkCookie, scrollToChapterStart, setBookmarkCookie } from "./lib/bookmark";

vi.mock("./lib/data", () => ({
  loadChapterData: vi.fn(),
  loadPhotosForDate: vi.fn(),
}));

vi.mock("./lib/bookmark", async () => {
  const actual = await vi.importActual("./lib/bookmark");

  return {
    ...actual,
    getBookmarkCookie: vi.fn(),
    scrollToChapterStart: vi.fn(),
    setBookmarkCookie: vi.fn(),
  };
});

function createChapter(title, slug, options = {}) {
  return {
    title,
    slug,
    date: options.date ?? null,
    tokens: marked.lexer(options.body ?? `${title} body copy.`),
  };
}

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.location.hash = "";
    document.title = "Travel Journal";
    document.cookie = "travel_bookmark=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;";
    getBookmarkCookie.mockReturnValue(null);
    loadPhotosForDate.mockResolvedValue([]);
  });

  it("renders chapter content and responds to hash navigation", async () => {
    loadChapterData.mockResolvedValue({
      documentTitle: "Travel Journal",
      chapters: [
        createChapter("Introduction", "introduction"),
        createChapter("Day Two", "day-two"),
      ],
    });

    render(<App />);

    expect(await screen.findByRole("heading", { level: 2, name: "Introduction" })).toBeInTheDocument();
    expect(screen.getByText("Introduction · Chapter 1 of 2")).toBeInTheDocument();
    // Note: setBookmarkCookie is NOT called on initial load (preserves existing bookmark)
    expect(setBookmarkCookie).not.toHaveBeenCalled();

    window.location.hash = "#day-two";
    window.dispatchEvent(new HashChangeEvent("hashchange"));

    expect(await screen.findByRole("heading", { level: 2, name: "Day Two" })).toBeInTheDocument();
    expect(screen.getByText("Day Two · Chapter 2 of 2")).toBeInTheDocument();
    expect(scrollToChapterStart).toHaveBeenCalled();
    // Now when navigating to a new chapter, the bookmark IS updated
    expect(setBookmarkCookie).toHaveBeenCalledWith("day-two", "Day Two", 0);
    await waitFor(() => {
      expect(document.title).toBe("Day Two | Travel Journal");
    });
  });

  it("renders the error state when chapter loading fails", async () => {
    loadChapterData.mockRejectedValue(new Error("manifest broke"));

    render(<App />);

    expect(await screen.findByText("Unable to load the travel narrative.")).toBeInTheDocument();
    expect(screen.getByText("manifest broke")).toBeInTheDocument();
    await waitFor(() => {
      expect(document.title).toBe("Travel journal unavailable");
    });
  });

  it("opens, advances, and closes the lightbox from a photo gallery", async () => {
    loadChapterData.mockResolvedValue({
      documentTitle: "Travel Journal",
      chapters: [createChapter("Gallery Day", "gallery-day", { date: "2026-04-03" })],
    });
    loadPhotosForDate.mockResolvedValue([
      "/travel/photos/2026-04-03/one.jpg",
      "/travel/photos/2026-04-03/two.jpg",
    ]);

    render(<App />);

    expect(await screen.findByRole("heading", { level: 2, name: "Gallery Day" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Open photo 1 of 2" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open photo 1 of 2" }));

    expect(await screen.findByRole("dialog", { name: "Photo viewer" })).toBeInTheDocument();
    expect(screen.getByAltText("Photo 1 of 2")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(await screen.findByAltText("Photo 2 of 2")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Photo viewer" })).not.toBeInTheDocument();
    });
  });

  it("shows bookmark banner only when bookmark is for a different chapter", async () => {
    const chapters = [
      createChapter("Introduction", "introduction"),
      createChapter("Day Two", "day-two"),
      createChapter("Day Three", "day-three"),
    ];

    loadChapterData.mockResolvedValue({
      documentTitle: "Travel Journal",
      chapters,
    });

    // Test 1: No banner when no bookmark exists
    getBookmarkCookie.mockReturnValue(null);
    render(<App />);
    expect(await screen.findByText("Introduction · Chapter 1 of 3")).toBeInTheDocument();
    expect(screen.queryByText(/Pick up where you left off/)).not.toBeInTheDocument();
  });

  it("does not show bookmark banner when bookmark is for current chapter", async () => {
    const chapters = [
      createChapter("Introduction", "introduction"),
      createChapter("Day Two", "day-two"),
    ];

    loadChapterData.mockResolvedValue({
      documentTitle: "Travel Journal",
      chapters,
    });

    // Bookmark is for the current chapter (Introduction)
    getBookmarkCookie.mockReturnValue({ slug: "introduction", title: "Introduction", scrollY: 100 });
    render(<App />);
    expect(await screen.findByText("Introduction · Chapter 1 of 2")).toBeInTheDocument();
    expect(screen.queryByText(/Pick up where you left off/)).not.toBeInTheDocument();
  });

  it("shows bookmark banner when bookmark is for a different chapter than current", async () => {
    const chapters = [
      createChapter("Introduction", "introduction"),
      createChapter("Day Two", "day-two"),
      createChapter("Day Three", "day-three"),
    ];

    loadChapterData.mockResolvedValue({
      documentTitle: "Travel Journal",
      chapters,
    });

    // Bookmark is for Day Two, but we're viewing Introduction (default)
    getBookmarkCookie.mockReturnValue({ slug: "day-two", title: "Day Two", scrollY: 50 });
    render(<App />);
    
    expect(await screen.findByText("Introduction · Chapter 1 of 3")).toBeInTheDocument();
    expect(await screen.findByText(/Pick up where you left off/)).toBeInTheDocument();
    expect(screen.getByText("Day Two")).toBeInTheDocument();
  });

  it("restores reading progress when user clicks resume bookmark", async () => {
    const chapters = [
      createChapter("Introduction", "introduction"),
      createChapter("Day Two", "day-two"),
      createChapter("Day Three", "day-three"),
    ];

    loadChapterData.mockResolvedValue({
      documentTitle: "Travel Journal",
      chapters,
    });

    // User has a saved bookmark for Day Two with scroll position 200
    getBookmarkCookie.mockReturnValue({ slug: "day-two", title: "Day Two", scrollY: 200 });
    render(<App />);

    // Initially on Introduction, bookmark banner visible
    expect(await screen.findByText("Introduction · Chapter 1 of 3")).toBeInTheDocument();
    expect(screen.getByText(/Pick up where you left off/)).toBeInTheDocument();

    // Find the "resume" link and click it
    const resumeLinks = screen.getAllByText("Day Two");
    const resumeLink = resumeLinks.find((link) => link.closest(".bookmark-banner-resume"));

    fireEvent.click(resumeLink);

    // Should navigate to Day Two
    expect(await screen.findByText("Day Two · Chapter 2 of 3")).toBeInTheDocument();
    // Bookmark banner should be dismissed
    expect(screen.queryByText(/Pick up where you left off/)).not.toBeInTheDocument();
  });

  it("dismisses bookmark banner when user clicks dismiss", async () => {
    const chapters = [
      createChapter("Introduction", "introduction"),
      createChapter("Day Two", "day-two"),
    ];

    loadChapterData.mockResolvedValue({
      documentTitle: "Travel Journal",
      chapters,
    });

    // User has a saved bookmark for Day Two
    getBookmarkCookie.mockReturnValue({ slug: "day-two", title: "Day Two", scrollY: 100 });
    render(<App />);

    expect(await screen.findByText(/Pick up where you left off/)).toBeInTheDocument();

    // Find and click the dismiss button (X)
    const dismissButton = screen.getByLabelText("Dismiss bookmark");
    fireEvent.click(dismissButton);

    // Bookmark banner should be gone
    await waitFor(() => {
      expect(screen.queryByText(/Pick up where you left off/)).not.toBeInTheDocument();
    });
  });

  it("clears bookmark banner when selecting a chapter from the dropdown", async () => {
    const chapters = [
      createChapter("Introduction", "introduction"),
      createChapter("Day Two", "day-two"),
    ];

    loadChapterData.mockResolvedValue({
      documentTitle: "Travel Journal",
      chapters,
    });

    getBookmarkCookie.mockReturnValue({ slug: "day-two", title: "Day Two", scrollY: 100 });
    render(<App />);

    expect(await screen.findByText(/Pick up where you left off/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Jump to chapter"), {
      target: { value: "day-two" },
    });

    await waitFor(() => {
      expect(screen.queryByText(/Pick up where you left off/)).not.toBeInTheDocument();
    });
  });

  it("preserves bookmark on fresh page load and allows resuming from previous session", async () => {
    const chapters = [
      createChapter("Chapter 1", "ch1"),
      createChapter("Chapter 2", "ch2"),
      createChapter("Chapter 3", "ch3"),
    ];

    // Simulate: User was on Chapter 2 with scroll position 300 in previous session
    getBookmarkCookie.mockReturnValue({
      slug: "ch2",
      title: "Chapter 2",
      scrollY: 300,
    });

    loadChapterData.mockResolvedValue({
      documentTitle: "Travel Journal",
      chapters,
    });

    render(<App />);

    // Page loads to default Chapter 1
    expect(await screen.findByText("Chapter 1 · Chapter 1 of 3")).toBeInTheDocument();

    // But bookmark banner suggests returning to Chapter 2
    expect(screen.getByText(/Pick up where you left off/)).toBeInTheDocument();
    expect(screen.getByText("Chapter 2")).toBeInTheDocument();

    // Verify setBookmarkCookie was NOT called on initial load (preserves old bookmark)
    expect(setBookmarkCookie).not.toHaveBeenCalled();

    // User navigates manually to Chapter 3
    window.location.hash = "#ch3";
    window.dispatchEvent(new HashChangeEvent("hashchange"));

    // Now setBookmarkCookie SHOULD be called to save new position
    await waitFor(() => {
      expect(setBookmarkCookie).toHaveBeenCalledWith("ch3", "Chapter 3", 0);
    });
  });
});
