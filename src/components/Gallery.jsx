import { useEffect, useMemo, useRef, useState } from "react";
import { loadAllPhotos } from "../lib/data";

const hydratedImageSources = new Set();

function LazyGalleryImage({ src, alt }) {
  const frameRef = useRef(null);
  const [shouldLoad, setShouldLoad] = useState(() => {
    if (hydratedImageSources.has(src)) {
      return true;
    }

    return typeof window !== "undefined" && !("IntersectionObserver" in window);
  });

  useEffect(() => {
    if (hydratedImageSources.has(src)) {
      setShouldLoad(true);
      return;
    }

    setShouldLoad(typeof window !== "undefined" && !("IntersectionObserver" in window));
  }, [src]);

  useEffect(() => {
    if (shouldLoad) {
      hydratedImageSources.add(src);
      return;
    }

    const frameElement = frameRef.current;

    if (!frameElement) {
      return;
    }

    if (!("IntersectionObserver" in window)) {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;

        if (entry?.isIntersecting) {
          hydratedImageSources.add(src);
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "0px 0px 120px 0px",
        threshold: 0.15,
      }
    );

    observer.observe(frameElement);

    return () => {
      observer.disconnect();
    };
  }, [shouldLoad, src]);

  return (
    <span ref={frameRef} className="gallery-thumb-frame">
      {shouldLoad && (
        <img
          className="gallery-thumb"
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
        />
      )}
    </span>
  );
}

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
            <LazyGalleryImage
              src={photo.src}
              alt={`${photo.chapterTitle || "Travel"} · ${photo.date || "Unknown date"} · photo ${photo.index + 1}`}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
