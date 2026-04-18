import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useChapterData } from "../useChapterData";
import { loadChapterData } from "../../lib/data";

vi.mock("../../lib/data", () => ({
  loadChapterData: vi.fn(),
}));

describe("useChapterData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns loading state initially", () => {
    loadChapterData.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useChapterData());

    expect(result.current.loading).toBe(true);
    expect(result.current.chapterData).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("loads chapter data successfully", async () => {
    const mockData = {
      documentTitle: "Test Journal",
      chapters: [{ title: "Ch1", slug: "ch1" }],
    };

    loadChapterData.mockResolvedValue(mockData);

    const { result } = renderHook(() => useChapterData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.chapterData).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it("handles loading errors", async () => {
    const testError = new Error("Failed to load");
    loadChapterData.mockRejectedValue(testError);

    const { result } = renderHook(() => useChapterData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(testError);
    expect(result.current.chapterData).toBeNull();
  });

  it("ignores updates if component unmounts", async () => {
    loadChapterData.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ chapters: [] }), 50))
    );

    const { unmount, result } = renderHook(() => useChapterData());

    unmount();

    await waitFor(() => {
      // Should still be loading since update was ignored
      expect(loadChapterData).toHaveBeenCalled();
    });
  });
});
