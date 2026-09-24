import '@testing-library/jest-dom/vitest';

import { vi } from 'vitest';

document.getAnimations = vi.fn(() => []);

// jsdom hides [popover] elements in its user-agent stylesheet, but implements neither the popover methods nor
// :popover-open, so a popover could never be shown. Mark open popovers with an attribute and show them from an
// author stylesheet instead (!important, since jsdom lets the more specific user-agent rule win otherwise):
// https://github.com/jsdom/jsdom/issues/3721
const popoverOpenAttribute = 'data-test-popover-open';
Object.defineProperty(HTMLElement.prototype, 'popover', {
  configurable: true,
  get(this: HTMLElement) {
    return this.getAttribute('popover');
  },
  set(this: HTMLElement, value: string | null) {
    if (value === null) {
      this.removeAttribute('popover');
    } else {
      this.setAttribute('popover', value);
    }
  },
});
HTMLElement.prototype.showPopover = function () {
  this.setAttribute(popoverOpenAttribute, '');
};
HTMLElement.prototype.hidePopover = function () {
  this.removeAttribute(popoverOpenAttribute);
};
HTMLElement.prototype.togglePopover = function (
  options?: Parameters<HTMLElement['togglePopover']>[0],
) {
  const force = typeof options === 'object' ? options.force : options;
  return this.toggleAttribute(popoverOpenAttribute, force);
};
const popoverStyle = document.createElement('style');
popoverStyle.textContent = `[popover][${popoverOpenAttribute}] { display: block !important; }`;
document.head.appendChild(popoverStyle);

const originalGetComputedStyle = window.getComputedStyle.bind(window);

// Its the second parameter to getComputedStyle that causes the error, so we create a mock that just forwards the first parameter to the original implementation, and ignores the second parameter.
vi.spyOn(window, 'getComputedStyle').mockImplementation((elt: Element) =>
  originalGetComputedStyle(elt),
);
