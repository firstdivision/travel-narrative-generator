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
    expect(setBookmarkCookie).toHaveBeenCalledWith("introduction", "Introduction", 0);

    window.location.hash = "#day-two";
    window.dispatchEvent(new HashChangeEvent("hashchange"));

    expect(await screen.findByRole("heading", { level: 2, name: "Day Two" })).toBeInTheDocument();
    expect(screen.getByText("Day Two · Chapter 2 of 2")).toBeInTheDocument();
    expect(scrollToChapterStart).toHaveBeenCalled();
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
});
