import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useIsMounted } from "../useIsMounted";

describe("useIsMounted", () => {
  it("returns true when mounted", () => {
    const { result } = renderHook(() => useIsMounted());

    expect(result.current()).toBe(true);
  });

  it("returns false after unmount", () => {
    const { result, unmount } = renderHook(() => useIsMounted());

    expect(result.current()).toBe(true);

    unmount();

    expect(result.current()).toBe(false);
  });

  it("can be used to guard state updates after async operations", async () => {
    const { result, unmount } = renderHook(() => useIsMounted());
    const isMounted = result.current;

    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(isMounted()).toBe(true);

    unmount();

    // After unmount, should return false
    expect(isMounted()).toBe(false);
  });
});
