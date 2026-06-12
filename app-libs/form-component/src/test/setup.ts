import '@testing-library/jest-dom/vitest';

document.getAnimations = vi.fn(() => []);

// jsdom has no layout, so document.elementFromPoint is missing. The design system's popover uses it to
// determine whether it is the top layer (e.g. for Escape light-dismiss). Returning the open popover lets
// that check resolve correctly in tests.
document.elementFromPoint = (): Element | null => {
  const popovers = document.querySelectorAll('[popover]');
  return popovers[popovers.length - 1] ?? null;
};

const originalGetComputedStyle = window.getComputedStyle.bind(window);

// Its the second parameter to getComputedStyle that causes the error, so we create a mock that just forwards the first parameter to the original implementation, and ignores the second parameter.
vi.spyOn(window, 'getComputedStyle').mockImplementation((elt: Element) =>
  originalGetComputedStyle(elt),
);
