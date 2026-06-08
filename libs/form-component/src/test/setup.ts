import '@testing-library/jest-dom/vitest';

document.getAnimations = vi.fn(() => []);

const originalGetComputedStyle = window.getComputedStyle.bind(window);

// Its the second parameter to getComputedStyle that causes the error, so we create a mock that just forwards the first parameter to the original implementation, and ignores the second parameter.
vi.spyOn(window, 'getComputedStyle').mockImplementation((elt: Element) =>
  originalGetComputedStyle(elt),
);
