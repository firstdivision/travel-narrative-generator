export function ChapterSelector({ chapters, currentSlug, loading, onJumpToChapter }) {
  const hasChapters = chapters.length > 0;

  return (
    <div className="hero-actions">
      <p className="journey-seal">Route Archive</p>
      <label className="jump-label" htmlFor="section-jump">
        Jump to chapter
      </label>
      <select
        id="section-jump"
        className="jump-select"
        disabled={!hasChapters || loading}
        value={hasChapters ? currentSlug : ""}
        onChange={(event) => {
          if (event.target.value) {
            onJumpToChapter(event.target.value);
          }
        }}
      >
        {!hasChapters ? (
          <option value="">{loading ? "Loading chapters..." : "No chapters available"}</option>
        ) : (
          [
            <option key="placeholder" value="">
              Jump to chapter
            </option>,
            ...chapters.map((chapter, index) => (
              <option key={chapter.slug} value={chapter.slug}>
                {`Chapter ${index + 1}: ${chapter.title}`}
              </option>
            )),
          ]
        )}
      </select>
    </div>
  );
}
