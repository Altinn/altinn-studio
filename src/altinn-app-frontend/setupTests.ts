import Enzyme from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import 'jest';
import '@testing-library/jest-dom/extend-expect';

import type { IAltinnWindow } from 'src/types';

// https://jestjs.io/docs/manual-mocks#mocking-methods-which-are-not-implemented-in-jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// org and app is assigned to window object, so to avoid 'undefined' in tests, they need to be set
const altinnWindow = window as Window as IAltinnWindow;
altinnWindow.org = 'ttd';
altinnWindow.app = 'test';
jest.setTimeout(10000);

Enzyme.configure({
  adapter: new Adapter(),
});
