import { useEffect, useState } from "react";
import { loadPhotosForDate } from "../lib/data";

export function PhotoGallery({ date, onOpenLightbox }) {
  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    let active = true;

    loadPhotosForDate(date).then((loadedPhotos) => {
      if (active) {
        setPhotos(loadedPhotos);
      }
    });

    return () => {
      active = false;
    };
  }, [date]);

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
