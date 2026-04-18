/**
 * Application-wide constants
 */

// Scroll position saving debounce time (milliseconds)
// Prevents excessive cookie writes while user is scrolling
export const SCROLL_SAVE_DEBOUNCE = 500;

// Cookie name for storing user's reading progress
export const BOOKMARK_COOKIE_NAME = "travel_bookmark";

// Polling interval for checking narrative manifest/chapter updates
export const CHAPTER_REFRESH_INTERVAL = 60_000;
