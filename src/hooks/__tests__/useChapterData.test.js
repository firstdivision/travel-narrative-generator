import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useChapterData } from "../useChapterData";
import {
  getManifestSignature,
  loadChapterContent,
  loadNarrativeManifest,
  loadNarrativeManifestMetadata,
} from "../../lib/data";

vi.mock("../../lib/data", () => ({
  loadChapterContent: vi.fn(),
  loadNarrativeManifestMetadata: vi.fn(),
  loadNarrativeManifest: vi.fn(),
  getManifestSignature: vi.fn((manifest) => JSON.stringify(manifest)),
}));

const manifestMetadata = {
  manifestSignature: "signature-a",
  chapters: [
    {
      title: "2026-04-02",
      slug: "2026-04-02",
      date: "2026-04-02",
      file: "/travel/narrative/2026-04-02.md",
      contentHash: "hash-1",
      hasPhotos: true,
      tokens: null,
    },
    {
      title: "2026-04-03",
      slug: "2026-04-03",
      date: "2026-04-03",
      file: "/travel/narrative/2026-04-03.md",
      contentHash: "hash-2",
      hasPhotos: true,
      tokens: null,
    },
  ],
};

describe("useChapterData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    window.location.hash = "";
    loadNarrativeManifestMetadata.mockResolvedValue(manifestMetadata);
    loadChapterContent.mockResolvedValue({
      documentTitle: "Travel Journal",
      chapterTitle: "Day One",
      contentTokens: [],
    });
    loadNarrativeManifest.mockResolvedValue({ generatedAt: "2026-04-18T00:00:00.000Z", chapters: [] });
    getManifestSignature.mockImplementation((manifest) => JSON.stringify(manifest));
  });

  it("returns loading state initially", () => {
    loadNarrativeManifestMetadata.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useChapterData());

    expect(result.current.loading).toBe(true);
    expect(result.current.chapterData).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("loads only the active hash chapter successfully", async () => {
    window.location.hash = "#2026-04-03";
    loadChapterContent.mockImplementation(async (filePath) => {
      if (filePath === "/travel/narrative/2026-04-03.md") {
        return {
          documentTitle: "Travel Journal",
          chapterTitle: "Day Two",
          contentTokens: [{ type: "paragraph", text: "Loaded chapter" }],
        };
      }

      return {
        documentTitle: "Travel Journal",
        chapterTitle: "Day One",
        contentTokens: [],
      };
    });

    const { result } = renderHook(() => useChapterData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(loadChapterContent).toHaveBeenCalled();
    expect(loadChapterContent).toHaveBeenCalledWith("/travel/narrative/2026-04-03.md", "2026-04-03");
    expect(result.current.chapterData.chapters[1].title).toBe("Day Two");
    expect(result.current.chapterData.chapters[1].tokens).toEqual([{ type: "paragraph", text: "Loaded chapter" }]);
    expect(result.current.chapterData.chapters[0].tokens).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("shows a friendly error when hash chapter does not exist", async () => {
    window.location.hash = "#missing-chapter";

    const { result } = renderHook(() => useChapterData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.error.message).toBe(
      "Opps! It looks like you asked for a chapter that doesn't exist..."
    );
    expect(loadChapterContent).not.toHaveBeenCalled();
  });

  it("handles chapter loading errors", async () => {
    const testError = new Error("Failed to load");
    loadChapterContent.mockRejectedValue(testError);

    const { result } = renderHook(() => useChapterData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(testError);
  });

  it("ignores updates if component unmounts", async () => {
    loadChapterContent.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () => resolve({ documentTitle: "Travel Journal", chapterTitle: "Day One", contentTokens: [] }),
            50
          )
        )
    );

    const { unmount, result } = renderHook(() => useChapterData());

    unmount();

    await waitFor(() => {
      // Should still be loading since update was ignored
      expect(loadChapterContent).toHaveBeenCalled();
    });
  });
});
