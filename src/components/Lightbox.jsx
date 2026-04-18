import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export function Lightbox({ isOpen, photos, index, onClose, onShift }) {
  const closeButtonRef = useRef(null);
  const touchStartXRef = useRef(0);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
      if (event.key === "ArrowLeft") {
        onShift(-1);
      }
      if (event.key === "ArrowRight") {
        onShift(1);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, onShift]);

  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || !photos.length) {
    return null;
  }

  const currentPhoto = photos[index];
  const single = photos.length <= 1;

  return createPortal(
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      onTouchStart={(event) => {
        touchStartXRef.current = event.touches[0].clientX;
      }}
      onTouchEnd={(event) => {
        const deltaX = event.changedTouches[0].clientX - touchStartXRef.current;
        if (Math.abs(deltaX) > 40) {
          onShift(deltaX < 0 ? 1 : -1);
        }
      }}
    >
      <div className="lightbox-backdrop" onClick={onClose} />
      <button
        ref={closeButtonRef}
        className="lightbox-close"
        aria-label="Close photo viewer"
        onClick={onClose}
      >
        &#x2715;
      </button>
      {!single && (
        <button className="lightbox-prev" aria-label="Previous photo" onClick={() => onShift(-1)}>
          &#x2039;
        </button>
      )}
      {!single && (
        <button className="lightbox-next" aria-label="Next photo" onClick={() => onShift(1)}>
          &#x203A;
        </button>
      )}
      <figure className="lightbox-figure">
        <img
          className="lightbox-img"
          src={currentPhoto}
          alt={`Photo ${index + 1} of ${photos.length}`}
        />
      </figure>
    </div>,
    document.body,
  );
}
