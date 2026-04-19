import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { marked } from "marked";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import {
  getManifestSignature,
  loadChapterContent,
  loadNarrativeManifest,
  loadNarrativeManifestMetadata,
  loadPhotosForDate,
} from "./lib/data";
import { getBookmarkCookie, scrollToChapterStart, setBookmarkCookie } from "./lib/bookmark";

vi.mock("./lib/data", () => ({
  loadChapterContent: vi.fn(),
  loadNarrativeManifestMetadata: vi.fn(),
  loadNarrativeManifest: vi.fn(),
  getManifestSignature: vi.fn((manifest) => JSON.stringify(manifest)),
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
    displaySlug: options.displaySlug ?? title,
    date: options.date ?? null,
    file: options.file ?? `/travel/narrative/${slug}.md`,
    hasPhotos: options.hasPhotos,
    contentHash: options.contentHash ?? `${slug}-hash`,
    body: options.body ?? `${title} body copy.`,
  };
}

function setupNarrative(chapters, documentTitle = "Travel Journal") {
  const metadata = {
    manifestSignature: "test-signature",
    chapters: chapters.map((chapter, index) => ({
      title: chapter.date || `Chapter ${index + 1}`,
      slug: chapter.slug,
      displaySlug: chapter.displaySlug,
      date: chapter.date,
      file: chapter.file,
      contentHash: chapter.contentHash,
      hasPhotos: chapter.hasPhotos !== false,
      tokens: null,
    })),
  };

  loadNarrativeManifestMetadata.mockResolvedValue(metadata);
  loadChapterContent.mockImplementation(async (filePath, fallbackTitle) => {
    const chapter = chapters.find((item) => item.file === filePath);

    if (!chapter) {
      throw new Error(`Unexpected chapter file: ${filePath}`);
    }

    return {
      documentTitle,
      chapterTitle: chapter.title || fallbackTitle,
      contentTokens: marked.lexer(chapter.body),
    };
  });
}

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    window.location.hash = "";
    document.title = "Travel Journal";
    document.cookie = "travel_bookmark=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;";
    getBookmarkCookie.mockReturnValue(null);
    loadPhotosForDate.mockResolvedValue([]);
    loadNarrativeManifest.mockResolvedValue({ chapters: [] });
    getManifestSignature.mockImplementation((manifest) => JSON.stringify(manifest));
  });

  it("renders chapter content and fetches chapter on hash navigation", async () => {
    setupNarrative([
      createChapter("Introduction", "introduction"),
      createChapter("Day Two", "day-two"),
    ]);

    render(<App />);

    expect(await screen.findByRole("heading", { level: 2, name: "Introduction" })).toBeInTheDocument();
    expect(screen.getByText("Introduction · Chapter 1 of 2")).toBeInTheDocument();
    expect(setBookmarkCookie).not.toHaveBeenCalled();
    expect(loadChapterContent).toHaveBeenCalled();

    window.location.hash = "#day-two";
    window.dispatchEvent(new HashChangeEvent("hashchange"));

    expect(await screen.findByText("Day Two · Chapter 2 of 2")).toBeInTheDocument();
    expect(scrollToChapterStart).toHaveBeenCalled();
    expect(setBookmarkCookie).toHaveBeenCalledWith("day-two", "Day Two", 0);
    expect(loadChapterContent.mock.calls.length).toBeGreaterThanOrEqual(2);
    await waitFor(() => {
      expect(document.title).toBe("Day Two | Travel Journal");
    });
  });

  it("uses manifest displaySlug labels in the chapter dropdown on first load", async () => {
    setupNarrative([
      createChapter("Loaded Intro Heading", "introduction", {
        date: "2026-04-02",
        displaySlug: "Thursday, April 2 - Coffee Before Contrails",
      }),
      createChapter("Loaded Day Two Heading", "day-two", {
        date: "2026-04-03",
        displaySlug: "Friday, April 3 - Godzilla, Jetlag, Ramen",
      }),
    ]);

    render(<App />);

    expect(await screen.findByRole("heading", { level: 2, name: "Loaded Intro Heading" })).toBeInTheDocument();

    const chapterButton = screen.getByRole("button", {
      name: /Thursday, April 2 - Coffee Before Contrails/,
    });
    expect(chapterButton).toBeInTheDocument();

    fireEvent.click(chapterButton);

    expect(
      await screen.findByText("Friday, April 3 - Godzilla, Jetlag, Ramen")
    ).toBeInTheDocument();
    expect(screen.queryByText("2026-04-03")).not.toBeInTheDocument();
  });

  it("scrolls the chapter dropdown to center the current chapter when opened", async () => {
    const originalOffsetTop = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetTop");
    const originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight");
    const originalClientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientHeight");
    const originalScrollHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollHeight");

    Object.defineProperty(HTMLElement.prototype, "offsetTop", {
      configurable: true,
      get() {
        if (this.getAttribute("role") !== "option" || !this.parentElement) {
          return 0;
        }

        return Array.from(this.parentElement.children).indexOf(this) * 40;
      },
    });

    Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
      configurable: true,
      get() {
        return this.getAttribute("role") === "option" ? 40 : 0;
      },
    });

    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,
      get() {
        return this.getAttribute("role") === "listbox" ? 200 : 0;
      },
    });

    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      get() {
        if (this.getAttribute("role") !== "listbox") {
          return 0;
        }

        return this.children.length * 40;
      },
    });

    try {
      setupNarrative(Array.from({ length: 12 }, (_, index) => {
        const chapterNumber = index + 1;
        return createChapter(`Chapter ${chapterNumber}`, `chapter-${chapterNumber}`);
      }));
      window.location.hash = "#chapter-8";

      render(<App />);

      expect(await screen.findByText("Chapter 8 · Chapter 8 of 12")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Chapter 8" }));

      const listbox = await screen.findByRole("listbox");

      await waitFor(() => {
        expect(listbox.scrollTop).toBe(200);
      });
    } finally {
      if (originalOffsetTop) {
        Object.defineProperty(HTMLElement.prototype, "offsetTop", originalOffsetTop);
      } else {
        delete HTMLElement.prototype.offsetTop;
      }

      if (originalOffsetHeight) {
        Object.defineProperty(HTMLElement.prototype, "offsetHeight", originalOffsetHeight);
      } else {
        delete HTMLElement.prototype.offsetHeight;
      }

      if (originalClientHeight) {
        Object.defineProperty(HTMLElement.prototype, "clientHeight", originalClientHeight);
      } else {
        delete HTMLElement.prototype.clientHeight;
      }

      if (originalScrollHeight) {
        Object.defineProperty(HTMLElement.prototype, "scrollHeight", originalScrollHeight);
      } else {
        delete HTMLElement.prototype.scrollHeight;
      }
    }
  });

  it("shows a photo indicator in the chapter dropdown only for chapters with photos", async () => {
    setupNarrative([
      createChapter("Loaded Intro Heading", "introduction", {
        date: "2026-04-02",
        displaySlug: "Thursday, April 2 - Coffee Before Contrails",
        hasPhotos: true,
      }),
      createChapter("Loaded Day Two Heading", "day-two", {
        date: "2026-04-03",
        displaySlug: "Friday, April 3 - Godzilla, Jetlag, Ramen",
        hasPhotos: false,
      }),
    ]);

    render(<App />);

    const chapterButton = await screen.findByRole("button", {
      name: /Thursday, April 2 - Coffee Before Contrails/,
    });

    fireEvent.click(chapterButton);

    const options = await screen.findAllByRole("option");

    expect(options[0]).toHaveTextContent("Photos");
    expect(options[1]).not.toHaveTextContent("Photos");
    expect(screen.getByLabelText("Includes photos")).toBeInTheDocument();
  });

  it("renders the error state when chapter loading fails", async () => {
    loadNarrativeManifestMetadata.mockResolvedValue({
      manifestSignature: "test-signature",
      chapters: [
        {
          title: "Chapter 1",
          slug: "chapter-1",
          date: "2026-04-02",
          file: "/travel/narrative/chapter-1.md",
          contentHash: "hash-1",
          hasPhotos: true,
          tokens: null,
        },
      ],
    });
    loadChapterContent.mockRejectedValue(new Error("manifest broke"));

    render(<App />);

    expect(await screen.findByText("Unable to load the travel narrative.")).toBeInTheDocument();
    expect(screen.getByText("manifest broke")).toBeInTheDocument();
    await waitFor(() => {
      expect(document.title).toBe("Travel journal unavailable");
    });
  });

  it("shows a friendly error for invalid chapter hash", async () => {
    window.location.hash = "#does-not-exist";
    setupNarrative([
      createChapter("Introduction", "introduction"),
      createChapter("Day Two", "day-two"),
    ]);

    render(<App />);

    expect(await screen.findByText("Unable to load the travel narrative.")).toBeInTheDocument();
    expect(
      screen.getByText("Opps! It looks like you asked for a chapter that doesn't exist...")
    ).toBeInTheDocument();
    expect(loadChapterContent).not.toHaveBeenCalled();
  });

  it("opens, advances, and closes the lightbox from a photo gallery", async () => {
    setupNarrative([
      createChapter("Gallery Day", "gallery-day", { date: "2026-04-03", hasPhotos: true }),
    ]);
    loadPhotosForDate.mockResolvedValue([
      "/travel/photos/2026-04-03/one.jpg",
      "/travel/photos/2026-04-03/two.jpg",
    ]);

    render(<App />);

    await waitFor(() => {
      expect(loadPhotosForDate).toHaveBeenCalledWith("2026-04-03");
    });
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
    setupNarrative([
      createChapter("Introduction", "introduction"),
      createChapter("Day Two", "day-two"),
      createChapter("Day Three", "day-three"),
    ]);

    getBookmarkCookie.mockReturnValue(null);
    render(<App />);
    expect(await screen.findByText("Introduction · Chapter 1 of 3")).toBeInTheDocument();
    expect(screen.queryByText(/Pick up where you left off/)).not.toBeInTheDocument();
  });

  it("does not show bookmark banner when bookmark is for current chapter", async () => {
    setupNarrative([
      createChapter("Introduction", "introduction"),
      createChapter("Day Two", "day-two"),
    ]);

    getBookmarkCookie.mockReturnValue({ slug: "introduction", title: "Introduction", scrollY: 100 });
    render(<App />);
    expect(await screen.findByText("Introduction · Chapter 1 of 2")).toBeInTheDocument();
    expect(screen.queryByText(/Pick up where you left off/)).not.toBeInTheDocument();
  });

  it("shows bookmark banner when bookmark is for a different chapter than current", async () => {
    setupNarrative([
      createChapter("Introduction", "introduction"),
      createChapter("Day Two", "day-two"),
      createChapter("Day Three", "day-three"),
    ]);

    getBookmarkCookie.mockReturnValue({ slug: "day-two", title: "Day Two", scrollY: 50 });
    render(<App />);

    expect(await screen.findByText("Introduction · Chapter 1 of 3")).toBeInTheDocument();
    expect(await screen.findByText(/Pick up where you left off/)).toBeInTheDocument();
    expect(screen.getByText("Day Two")).toBeInTheDocument();
  });

  it("restores reading progress when user clicks resume bookmark", async () => {
    setupNarrative([
      createChapter("Introduction", "introduction"),
      createChapter("Day Two", "day-two"),
      createChapter("Day Three", "day-three"),
    ]);

    getBookmarkCookie.mockReturnValue({ slug: "day-two", title: "Day Two", scrollY: 200 });
    render(<App />);

    expect(await screen.findByText("Introduction · Chapter 1 of 3")).toBeInTheDocument();
    expect(screen.getByText(/Pick up where you left off/)).toBeInTheDocument();

    const resumeLinks = screen.getAllByText("Day Two");
    const resumeLink = resumeLinks.find((link) => link.closest(".bookmark-banner-resume"));

    fireEvent.click(resumeLink);

    expect(await screen.findByText("Day Two · Chapter 2 of 3")).toBeInTheDocument();
    expect(screen.queryByText(/Pick up where you left off/)).not.toBeInTheDocument();
  });

  it("dismisses bookmark banner when user clicks dismiss", async () => {
    setupNarrative([
      createChapter("Introduction", "introduction"),
      createChapter("Day Two", "day-two"),
    ]);

    getBookmarkCookie.mockReturnValue({ slug: "day-two", title: "Day Two", scrollY: 100 });
    render(<App />);

    expect(await screen.findByText(/Pick up where you left off/)).toBeInTheDocument();

    const dismissButton = screen.getByLabelText("Dismiss bookmark");
    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(screen.queryByText(/Pick up where you left off/)).not.toBeInTheDocument();
    });
  });

  it("clears bookmark banner when selecting a chapter from the dropdown", async () => {
    setupNarrative([
      createChapter("Introduction", "introduction"),
      createChapter("Day Two", "day-two"),
    ]);

    getBookmarkCookie.mockReturnValue({ slug: "day-two", title: "Day Two", scrollY: 100 });
    render(<App />);

    expect(await screen.findByText(/Pick up where you left off/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Introduction" }));
    fireEvent.click(await screen.findByRole("option", { name: /Day Two/ }));

    await waitFor(() => {
      expect(screen.queryByText(/Pick up where you left off/)).not.toBeInTheDocument();
    });
  });

  it("preserves bookmark on fresh page load and allows resuming from previous session", async () => {
    setupNarrative([
      createChapter("Chapter 1", "ch1"),
      createChapter("Chapter 2", "ch2"),
      createChapter("Chapter 3", "ch3"),
    ]);

    getBookmarkCookie.mockReturnValue({
      slug: "ch2",
      title: "Chapter 2",
      scrollY: 300,
    });

    render(<App />);

    expect(await screen.findByText("Chapter 1 · Chapter 1 of 3")).toBeInTheDocument();
    expect(await screen.findByText(/Pick up where you left off/)).toBeInTheDocument();
    expect(screen.getByText("Chapter 2")).toBeInTheDocument();
    expect(setBookmarkCookie).not.toHaveBeenCalled();

    window.location.hash = "#ch3";
    window.dispatchEvent(new HashChangeEvent("hashchange"));

    await waitFor(() => {
      expect(setBookmarkCookie).toHaveBeenCalledWith("ch3", "Chapter 3", 0);
    });
  });

  it("does not load day photo index when chapter hasPhotos is false", async () => {
    window.location.hash = "";

    setupNarrative([
      createChapter("No Photo Day", "no-photo-day", {
        date: "2026-04-08",
        hasPhotos: false,
      }),
    ]);

    render(<App />);

    await waitFor(() => {
      expect(loadChapterContent).toHaveBeenCalled();
    });

    expect(loadPhotosForDate).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Day photographs")).not.toBeInTheDocument();
  });
});
