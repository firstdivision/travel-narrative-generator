import { useEffect, useRef } from "react";

/**
 * Hook to safely check if component is still mounted.
 * Useful for cleanup after async operations to prevent state updates on unmounted components.
 *
 * @returns {Function} Returns a function that checks if component is mounted
 * @example
 * const isMounted = useIsMounted();
 * loadData().then(() => {
 *   if (isMounted()) setData(result);
 * });
 */
export function useIsMounted() {
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return () => isMountedRef.current;
}
