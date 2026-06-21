import { BOOKMARK_COOKIE_NAME } from "./constants";

export function setBookmarkCookie(slug, title, scrollY = 0) {
  const value = encodeURIComponent(JSON.stringify({ slug, title, scrollY }));
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  document.cookie = `${BOOKMARK_COOKIE_NAME}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`;
}

export function getBookmarkCookie() {
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${BOOKMARK_COOKIE_NAME}=`));

  if (!match) {
    return null;
  }

  try {
    return JSON.parse(decodeURIComponent(match.split("=").slice(1).join("=")));
  } catch {
    return null;
  }
}

export function getHashSlug() {
  return decodeURIComponent(window.location.hash.replace(/^#/, "")).trim();
}

export function getChapterIndexFromHash(chapters) {
  const chapterSlug = getHashSlug();

  if (!chapterSlug) {
    return 0;
  }

  const chapterIndex = chapters.findIndex((chapter) => chapter.slug === chapterSlug);
  return chapterIndex >= 0 ? chapterIndex : 0;
}

export function scrollToChapterStart() {
  // iOS Safari can ignore smooth scroll on hash-driven rerenders; force top immediately.
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  window.scrollTo({
    top: 0,
    behavior: "auto",
  });

  window.requestAnimationFrame(() => {
    window.scrollTo(0, 0);
  });
}
