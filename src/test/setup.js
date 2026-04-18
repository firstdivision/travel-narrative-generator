import "@testing-library/jest-dom/vitest";

if (!Element.prototype.scrollIntoView) {
	Element.prototype.scrollIntoView = () => {};
}

if (!window.scrollTo) {
	window.scrollTo = () => {};
}

if (!window.requestAnimationFrame) {
	window.requestAnimationFrame = (callback) => callback();
}
