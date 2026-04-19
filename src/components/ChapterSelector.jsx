import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function ChapterSelector({ chapters, currentSlug, loading, onJumpToChapter }) {
  const [open, setOpen] = useState(false);
  const [listPos, setListPos] = useState({ top: 0, left: 0, width: 0 });
  const [canScrollDown, setCanScrollDown] = useState(false);
  const hasChapters = chapters.length > 0;
  const labelId = useId();
  const listboxId = useId();
  const buttonRef = useRef(null);
  const listRef = useRef(null);
  const ulRef = useRef(null);
  const dropdownRef = useRef(null);

  const currentIndex = chapters.findIndex((c) => c.slug === currentSlug);
  const currentChapter = chapters[currentIndex] ?? null;

  const buttonLabel =
    !hasChapters
      ? loading
        ? "Loading chapters…"
        : "No chapters available"
      : currentChapter
        ? `${currentChapter.displaySlug || currentChapter.title}`
        : "Jump to chapter";

  // Track whether the list can scroll further down
  useLayoutEffect(() => {
    if (!open) return;
    const ul = ulRef.current;
    if (!ul) return;
    const check = () => {
      setCanScrollDown(ul.scrollTop + ul.clientHeight < ul.scrollHeight - 1);
    };
    check();
    ul.addEventListener("scroll", check, { passive: true });
    return () => ul.removeEventListener("scroll", check);
  }, [open]);

  // Compute dropdown position before paint when opening
  useLayoutEffect(() => {
    if (!open || !dropdownRef.current) return;
    const rect = dropdownRef.current.getBoundingClientRect();
    const maxWidth = Math.min(480, window.innerWidth - 16);
    const width = Math.max(rect.width, Math.min(maxWidth, window.innerWidth - rect.left - 8));
    setListPos({
      top: rect.bottom + window.scrollY + 6,
      left: rect.left + window.scrollX,
      width,
    });
  }, [open]);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        !listRef.current?.contains(e.target) &&
        !buttonRef.current?.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape, navigate with arrow keys
  const handleButtonKeyDown = (e) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
      // Focus the current (or first) option after render
      requestAnimationFrame(() => {
        const active = listRef.current?.querySelector('[aria-selected="true"]') ??
          listRef.current?.querySelector('[role="option"]');
        active?.focus();
      });
    }
  };

  const handleOptionKeyDown = (e, slug) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      selectChapter(slug);
    } else if (e.key === "Escape") {
      setOpen(false);
      buttonRef.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      e.currentTarget.nextElementSibling?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = e.currentTarget.previousElementSibling;
      if (prev) {
        prev.focus();
      } else {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
  };

  const selectChapter = (slug) => {
    setOpen(false);
    onJumpToChapter(slug);
    buttonRef.current?.focus();
  };

  return (
    <div className="hero-actions">
      <p className="journey-seal">Route Archive</p>
      <div className="chapter-dropdown" ref={dropdownRef}>
        <button
          ref={buttonRef}
          className="chapter-dropdown-button"
          disabled={!hasChapters || loading}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-labelledby={`${labelId} ${listboxId}-btn`}
          id={`${listboxId}-btn`}
          onClick={() => setOpen((o) => !o)}
          onKeyDown={handleButtonKeyDown}
        >
          <span className="chapter-dropdown-value">{buttonLabel}</span>
          <svg
            className={`chapter-dropdown-chevron${open ? " is-open" : ""}`}
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="8"
            viewBox="0 0 12 8"
            aria-hidden="true"
          >
            <path
              fill="none"
              stroke="#e8d4ab"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M1 1.25 6 6.25l5-5"
            />
          </svg>
        </button>

        {open && createPortal(
          <div
            ref={listRef}
            className="chapter-dropdown-portal"
            style={{ top: listPos.top, left: listPos.left, width: listPos.width }}
          >
            <ul
              ref={ulRef}
              id={listboxId}
              role="listbox"
              aria-labelledby={labelId}
              className="chapter-dropdown-list"
            >
              {chapters.map((chapter, index) => (
                <li
                  key={chapter.slug}
                  role="option"
                  aria-selected={chapter.slug === currentSlug}
                  className={`chapter-dropdown-option${chapter.slug === currentSlug ? " is-current" : ""}`}
                  tabIndex={0}
                  onClick={() => selectChapter(chapter.slug)}
                  onKeyDown={(e) => handleOptionKeyDown(e, chapter.slug)}
                >
                  <span className="chapter-dropdown-option-num">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="chapter-dropdown-option-title">
                    {chapter.displaySlug || chapter.title}
                  </span>
                  {chapter.hasPhotos && (
                    <span className="chapter-dropdown-option-photos" aria-label="Includes photos">
                      Photos
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {canScrollDown && (
              <div className="chapter-dropdown-scroll-hint" aria-hidden="true" />
            )}
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}
