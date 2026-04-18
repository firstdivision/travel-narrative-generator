export function BookmarkBanner({ bookmark, nextChapter, onResume, onDismiss, onReadNext }) {
  if (!bookmark) {
    return null;
  }

  return (
    <div className="bookmark-banner" role="status">
      <p className="bookmark-banner-heading">Pick up where you left off?</p>
      <span className="bookmark-banner-text">
        Continue reading {" "}
        <a
          className="bookmark-banner-resume"
          href={`#${bookmark.slug}`}
          onClick={(event) => {
            event.preventDefault();
            onResume();
          }}
        >
          <strong>{bookmark.title}</strong>
        </a>
        {nextChapter ? (
          <>
            {", or start the next chapter "}
            <a
              className="bookmark-banner-readnew"
              href={`#${nextChapter.slug}`}
              onClick={() => {
                onReadNext();
              }}
            >
              <strong>{nextChapter.title}</strong>
            </a>
            ?
          </>
        ) : (
          "?"
        )}
      </span>
      <button className="bookmark-banner-dismiss" aria-label="Dismiss bookmark" onClick={onDismiss}>
        &#x2715;
      </button>
    </div>
  );
}
