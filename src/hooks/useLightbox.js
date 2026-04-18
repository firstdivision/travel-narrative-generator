import { useState } from "react";

/**
 * Hook to manage lightbox (photo viewer) state.
 * Handles opening/closing and navigating between photos.
 *
 * @returns {Object} Lightbox state and control methods
 */
export function useLightbox() {
  const [lightboxPhotos, setLightboxPhotos] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  return {
    lightboxOpen,
    lightboxPhotos,
    lightboxIndex,
    openLightbox(photos, startIndex) {
      setLightboxPhotos(photos);
      setLightboxIndex(startIndex);
      setLightboxOpen(true);
    },
    closeLightbox() {
      setLightboxOpen(false);
    },
    shiftLightbox(direction) {
      setLightboxIndex((currentIndex) => {
        if (!lightboxPhotos.length) {
          return 0;
        }

        return (currentIndex + direction + lightboxPhotos.length) % lightboxPhotos.length;
      });
    },
  };
}
