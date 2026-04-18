import { useEffect, useState } from "react";
import { loadPhotosForDate } from "../lib/data";

export function PhotoGallery({ date, hasPhotos, onOpenLightbox }) {
  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    let active = true;

    const loadPhotos = async () => {
      if (!date || hasPhotos === false) {
        if (active) {
          setPhotos([]);
        }

        return;
      }

      const loadedPhotos = await loadPhotosForDate(date);

      if (active) {
        setPhotos(loadedPhotos);
      }
    };

    loadPhotos();

    return () => {
      active = false;
    };
  }, [date, hasPhotos]);

  if (!photos.length) {
    return null;
  }

  return (
    <section className="photo-gallery" aria-label="Day photographs">
      {photos.map((src, index) => (
        <button
          key={src}
          className="gallery-thumb-btn"
          aria-label={`Open photo ${index + 1} of ${photos.length}`}
          onClick={() => onOpenLightbox(photos, index)}
        >
          <img
            className="gallery-thumb"
            src={src}
            alt={`Day photo ${index + 1}`}
            loading="lazy"
          />
        </button>
      ))}
    </section>
  );
}
