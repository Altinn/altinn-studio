import '@testing-library/jest-dom';
import '@testing-library/jest-dom/jest-globals';
import 'core-js/stable/structured-clone'; // https://github.com/jsdom/jsdom/issues/3363
import 'jest';

import { jest } from '@jest/globals';
import { configure as testingLibraryConfigure } from '@testing-library/dom';
import dotenv from 'dotenv';
import { jestPreviewConfigure } from 'jest-preview';
import { TextDecoder, TextEncoder } from 'util';

import { getIncomingApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import type { fetchApplicationMetadata } from 'src/queries/queries';
import type { AppQueries } from 'src/queries/types';

// Importing CSS for jest-preview to look nicer
import '@digdir/designsystemet-theme/brand/altinn/tokens.css';
import 'src/index.css';
import 'src/styles/shared.css';

const env = dotenv.config();

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

Object.defineProperty(document, 'fonts', {
  value: { ready: Promise.resolve({}) },
});

// Forcing a low timeout for useDelayedSaveState()
global.delayedSaveState = 50;

window.forceNodePropertiesValidation = 'off';

window.inUnitTest = true;

// org and app is assigned to window object, so to avoid 'undefined' in tests, they need to be set
window.org = 'ttd';
window.app = 'test';

window.logError = (...args) => {
  throw new Error(args.join(' '));
};
window.logWarn = window.logError;
window.logInfo = window.logError;
window.logErrorOnce = window.logError;
window.logWarnOnce = window.logError;
window.logInfoOnce = window.logError;

window.scrollTo = () => {};

jest.setTimeout(env.parsed?.JEST_TIMEOUT ? parseInt(env.parsed.JEST_TIMEOUT, 10) : 20000);

jest.mock('axios');

global.TextEncoder = TextEncoder;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).TextDecoder = TextDecoder;

// eslint-disable-next-line @typescript-eslint/no-require-imports
global.ResizeObserver = require('resize-observer-polyfill');

const autoPreview = env.parsed?.JEST_PREVIEW_AUTO ? env.parsed.JEST_PREVIEW_AUTO === 'true' : false;
jestPreviewConfigure({ autoPreview });

testingLibraryConfigure({
  asyncUtilTimeout: env.parsed?.WAITFOR_TIMEOUT ? parseInt(env.parsed.WAITFOR_TIMEOUT, 10) : 15000,
});

jest.mock('src/queries/queries', () => ({
  ...jest.requireActual<AppQueries>('src/queries/queries'),
  fetchApplicationMetadata: jest
    .fn<typeof fetchApplicationMetadata>()
    .mockImplementation(() => Promise.resolve(getIncomingApplicationMetadataMock())),
}));
