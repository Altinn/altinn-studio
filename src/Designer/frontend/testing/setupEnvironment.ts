// Browser APIs that jsdom lacks, shared by the Jest and Vitest setups.
// The global `jest` object points at Vitest's `vi` when running under Vitest, see vitestJestShim.ts.
import 'whatwg-fetch';
import '@oddbird/popover-polyfill';
import { configure } from '@testing-library/dom';
import { TextEncoder, TextDecoder } from 'util';
import { webcrypto } from 'crypto';

// Newer jsdom versions hide [popover] elements but have no Popover API, so the polyfill's open state never shows them:
// https://github.com/jsdom/jsdom/issues/3721
const popoverStyle = document.createElement('style');
popoverStyle.textContent = '[popover].\\:popover-open { display: block !important; }';
document.head.appendChild(popoverStyle);

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: jest.fn(),
});

// polyfill for jsdom (taken from https://stackoverflow.com/questions/68468203/why-am-i-getting-textencoder-is-not-defined-in-jest)
Object.assign(global, { TextDecoder, TextEncoder });

// ResizeObserver must be mocked because it is used by the Popover component from the design system, but it is not supported by React Testing Library.
class ResizeObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}

window.ResizeObserver = ResizeObserver;

// document.getAnimations must be mocked because it is used by the design system, but it is not supported by React Testing Library.
Object.defineProperty(document, 'getAnimations', {
  value: () => [],
  writable: true,
});

// document.elementFromPoint must be mocked because the Popover component from the design system uses
// it to check whether it is the top layer, but jsdom has no layout, so every element reports a
// zero-sized rect. Returning the open popover lets the Escape key reach it.
Object.defineProperty(document, 'elementFromPoint', {
  value: () =>
    Array.from(document.querySelectorAll<HTMLElement>('[popover]')).findLast(
      (element) => element.matches(':popover-open') || element.classList.contains(':popover-open'),
    ) ?? document.body,
  writable: true,
});

// Use Node's implementation of Web Crypto API, since jsdom does not have access to browser's Web Crypto API
Object.defineProperty(window, 'crypto', {
  value: webcrypto,
  writable: true,
});

// Workaround for the known issue. For more info, see this: https://github.com/jsdom/jsdom/issues/3294#issuecomment-1268330372
HTMLDialogElement.prototype.showModal = jest.fn(function mock(this: HTMLDialogElement) {
  this.open = true;
});
HTMLDialogElement.prototype.close = jest.fn(function mock(this: HTMLDialogElement) {
  if (this.open) {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  }
});

const TESTING_LIBRARY_TIMEOUT_MILLISECONDS = 2000;

configure({ asyncUtilTimeout: TESTING_LIBRARY_TIMEOUT_MILLISECONDS });
