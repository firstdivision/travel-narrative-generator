import { useEffect, useMemo, useState } from "react";
import { loadAllPhotos } from "../lib/data";

export function Gallery({ chapters, onOpenLightbox }) {
  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const mergedPhotos = await loadAllPhotos(chapters);

      if (active) {
        setPhotos(mergedPhotos);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [chapters]);

  const lightboxPhotos = useMemo(() => photos.map((photo) => photo.src), [photos]);

  if (!photos.length) {
    return (
      <section className="gallery-shell" aria-live="polite">
        <header className="gallery-header">
          <p className="chapter-kicker">Global Gallery</p>
          <h2 className="chapter-title">All Photos</h2>
        </header>
        <p className="status">No photos are available yet.</p>
      </section>
    );
  }

  return (
    <section className="gallery-shell" aria-label="All travel photos">
      <header className="gallery-header">
        <p className="chapter-kicker">Global Gallery</p>
        <h2 className="chapter-title">All Photos</h2>
      </header>

      <div className="photo-gallery photo-gallery-all">
        {photos.map((photo, index) => (
          <button
            key={`${photo.src}-${index}`}
            className="gallery-thumb-btn"
            aria-label={`Open photo ${index + 1} of ${photos.length}`}
            onClick={() => onOpenLightbox(lightboxPhotos, index)}
          >
            <img
              className="gallery-thumb"
              src={photo.src}
              alt={`${photo.chapterTitle || "Travel"} · ${photo.date || "Unknown date"} · photo ${photo.index + 1}`}
              loading="lazy"
              decoding="async"
            />
          </button>
        ))}
      </div>
    </section>
  );
}
