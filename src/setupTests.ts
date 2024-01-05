/* eslint-disable no-relative-import-paths/no-relative-import-paths */
import 'jest';
import '@testing-library/jest-dom';
import '@testing-library/jest-dom/jest-globals';
import 'core-js/stable/structured-clone'; // https://github.com/jsdom/jsdom/issues/3363

import { configure as testingLibraryConfigure } from '@testing-library/dom';
import dotenv from 'dotenv';
import { jestPreviewConfigure } from 'jest-preview';
import { TextDecoder, TextEncoder } from 'util';

import type { AppQueries } from 'src/queries/types';

// Importing CSS for jest-preview to look nicer
import 'src/index.css';
import 'src/styles/tjenester3.css';
import 'src/styles/shared.css';
import '@digdir/design-system-tokens/brand/altinn/tokens.css';

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
(global as any).delayedSaveState = 50;

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

(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;

global.ResizeObserver = require('resize-observer-polyfill');

const autoPreview = env.parsed?.JEST_PREVIEW_AUTO ? env.parsed.JEST_PREVIEW_AUTO === 'true' : false;
jestPreviewConfigure({ autoPreview });

testingLibraryConfigure({
  asyncUtilTimeout: env.parsed?.WAITFOR_TIMEOUT ? parseInt(env.parsed.WAITFOR_TIMEOUT, 10) : 15000,
});

type QueriesAsMocks = {
  [K in keyof AppQueries]: jest.Mock;
};
interface ExpectLoadingSpec {
  loadingReason: string;
  queries: QueriesAsMocks;
  dispatchedActions: any[];
  ignoredActions: any[];
}

expect.extend({
  toNotBeLoading: ({ loadingReason, queries, dispatchedActions, ignoredActions }: ExpectLoadingSpec) => {
    if (loadingReason) {
      return {
        message: () => {
          const queryCalls: string[] = [];
          for (const [name, { mock }] of Object.entries(queries)) {
            if (mock.calls.length > 0) {
              for (const args of mock.calls) {
                const argsAsStr = args.map((arg: any) => JSON.stringify(arg)).join(', ');
                queryCalls.push(`- ${name}(${argsAsStr})`);
              }
            }
          }

          const dispatched: string[] = [];
          for (const action of dispatchedActions) {
            dispatched.push(`- ${JSON.stringify(action)}`);
          }

          const ignored: string[] = [];
          for (const action of ignoredActions) {
            ignored.push(`- ${JSON.stringify(action)}`);
          }

          return [
            `Expected to not be loading, but was loading because of '${loadingReason}'.`,
            '',
            `Queries called:`,
            ...queryCalls,
            '',
            'Dispatched actions:',
            ...dispatched,
            '',
            'Ignored actions:',
            ...ignored,
            '',
            'Consider if you need to increase WAITFOR_TIMEOUT if your machine is slow.',
          ].join('\n');
        },
        pass: false,
      };
    }

    return {
      message: () => `Expected to not be loading, and no current loading reason was found`,
      pass: true,
    };
  },
});
