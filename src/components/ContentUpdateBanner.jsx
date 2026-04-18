export function ContentUpdateBanner({ notice, onReload, onDismiss }) {
  if (!notice) {
    return null;
  }

  if (notice.type === "current-chapter-updated") {
    return (
      <div className="content-update-banner content-update-banner-alert" role="alert">
        <p className="content-update-heading">Chapter update available</p>
        <p className="content-update-text">
          <strong>{notice.chapterTitle}</strong>
          {" "}
          was updated on the server. Reload to view the latest version?
        </p>
        <div className="content-update-actions">
          <button className="content-update-button" type="button" onClick={onReload}>
            Reload chapter
          </button>
          <button className="content-update-dismiss" type="button" onClick={onDismiss}>
            Not now
          </button>
        </div>
      </div>
    );
  }

  const message =
    notice.type === "new-chapters-added"
      ? notice.count === 1
        ? "A new chapter was added and chapter navigation was refreshed."
        : `${notice.count} new chapters were added and chapter navigation was refreshed.`
      : "Chapter updates were found and chapter navigation was refreshed.";

  return (
    <div className="content-update-banner" role="status">
      <p className="content-update-heading">Journal refreshed</p>
      <p className="content-update-text">{message}</p>
      <button className="content-update-dismiss" type="button" onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  );
}
