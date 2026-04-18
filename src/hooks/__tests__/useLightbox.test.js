import { renderHook, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useLightbox } from "../useLightbox";

describe("useLightbox", () => {
  it("initializes with closed state", () => {
    const { result } = renderHook(() => useLightbox());

    expect(result.current.lightboxOpen).toBe(false);
    expect(result.current.lightboxPhotos).toEqual([]);
    expect(result.current.lightboxIndex).toBe(0);
  });

  it("opens lightbox with photos and index", () => {
    const { result } = renderHook(() => useLightbox());
    const photos = ["/photo1.jpg", "/photo2.jpg", "/photo3.jpg"];

    act(() => {
      result.current.openLightbox(photos, 1);
    });

    expect(result.current.lightboxOpen).toBe(true);
    expect(result.current.lightboxPhotos).toEqual(photos);
    expect(result.current.lightboxIndex).toBe(1);
  });

  it("closes lightbox", () => {
    const { result } = renderHook(() => useLightbox());

    act(() => {
      result.current.openLightbox(["/photo.jpg"], 0);
    });

    expect(result.current.lightboxOpen).toBe(true);

    act(() => {
      result.current.closeLightbox();
    });

    expect(result.current.lightboxOpen).toBe(false);
  });

  it("shifts lightbox index forward", () => {
    const { result } = renderHook(() => useLightbox());
    const photos = ["/photo1.jpg", "/photo2.jpg", "/photo3.jpg"];

    act(() => {
      result.current.openLightbox(photos, 0);
    });

    act(() => {
      result.current.shiftLightbox(1);
    });

    expect(result.current.lightboxIndex).toBe(1);
  });

  it("shifts lightbox index backward", () => {
    const { result } = renderHook(() => useLightbox());
    const photos = ["/photo1.jpg", "/photo2.jpg", "/photo3.jpg"];

    act(() => {
      result.current.openLightbox(photos, 1);
    });

    act(() => {
      result.current.shiftLightbox(-1);
    });

    expect(result.current.lightboxIndex).toBe(0);
  });

  it("wraps around when shifting past boundaries", () => {
    const { result } = renderHook(() => useLightbox());
    const photos = ["/photo1.jpg", "/photo2.jpg"];

    act(() => {
      result.current.openLightbox(photos, 1);
    });

    // Shift forward past end
    act(() => {
      result.current.shiftLightbox(1);
    });

    expect(result.current.lightboxIndex).toBe(0);

    // Shift backward past start
    act(() => {
      result.current.shiftLightbox(-1);
    });

    expect(result.current.lightboxIndex).toBe(1);
  });
});
