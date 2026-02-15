import '@testing-library/jest-dom';
import '@testing-library/jest-dom/jest-globals';
import 'core-js/stable/structured-clone'; // https://github.com/jsdom/jsdom/issues/3363
import 'jest';
// Importing CSS for jest-preview to look nicer
import '@digdir/designsystemet-css';
import '@digdir/designsystemet-theme';

import { jest } from '@jest/globals';
import { configure as testingLibraryConfigure } from '@testing-library/dom';
import dotenv from 'dotenv';
import { jestPreviewConfigure } from 'jest-preview';
import { TextDecoder, TextEncoder } from 'util';
import type { AxiosResponse } from 'axios';

import { getApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { getApplicationSettingsMock } from 'src/__mocks__/getApplicationSettingsMock';
import { getFooterLayoutMock } from 'src/__mocks__/getFooterLayoutMock';
// Importing CSS for jest-preview to look nicer
import { getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import { getLayoutSetsMock } from 'src/__mocks__/getLayoutSetsMock';
import { getPartyMock } from 'src/__mocks__/getPartyMock';
import { getProcessDataMock } from 'src/__mocks__/getProcessDataMock';
import { getProfileMock } from 'src/__mocks__/getProfileMock';
import { getTextResourceMapMock, getTextResourcesMock } from 'src/__mocks__/getTextResourcesMock';
import type {
  doProcessNext,
  doUpdateAttachmentTags,
  fetchInstanceData,
  fetchProcessState,
  fetchUserProfile,
} from 'src/queries/queries';
import type { AppQueries } from 'src/queries/types';
import type { IProcess } from 'src/types/shared';

import 'src/index.css';
import 'src/styles/shared.css';

const env = dotenv.config({ quiet: true });

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

// https://github.com/jsdom/jsdom/issues/3002
Element.prototype.getClientRects = () => ({
  item: () => null,
  length: 0,
  // @ts-expect-error ignore
  [Symbol.iterator]: jest.fn(),
});

// Forcing a low timeout for useDelayedSaveState()
global.delayedSaveState = 50;

window.forceNodePropertiesValidation = 'off';

window.inUnitTest = true;

// org and app is assigned to window object, so to avoid 'undefined' in tests, they need to be set
window.org = 'ttd';
window.app = 'test';

// Set up altinnAppGlobalData with default mocks
window.altinnAppGlobalData = {
  applicationMetadata: getApplicationMetadataMock(),
  frontendSettings: getApplicationSettingsMock(),
  footer: getFooterLayoutMock(),
  layoutSets: getLayoutSetsMock(),
  availableLanguages: [{ language: 'nb' }, { language: 'nn' }, { language: 'en' }],
  selectedParty: getPartyMock(),
  textResources: { language: 'en', resources: getTextResourcesMock() },
};

window.logError = (...args) => {
  throw new Error(args.join(' '));
};
window.logWarn = window.logError;
window.logInfo = window.logError;
window.logErrorOnce = window.logError;
window.logWarnOnce = window.logError;
window.logInfoOnce = window.logError;

window.scrollTo = () => {};
document.getAnimations = () => [];

jest.setTimeout(env.parsed?.JEST_TIMEOUT ? parseInt(env.parsed.JEST_TIMEOUT, 10) : 20000);

jest.mock('axios');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).TextEncoder = TextEncoder;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).TextDecoder = TextDecoder;

// Add Request polyfill for tests that use fetch/Request
if (!globalThis.Request) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).Request = class Request {
    url: string;
    method: string;
    headers: Record<string, string>;
    signal?: AbortSignal;
    constructor(url: string, init?: { method?: string; signal?: AbortSignal }) {
      this.url = url;
      this.method = init?.method ?? 'GET';
      this.headers = {};
      this.signal = init?.signal;
    }
  };
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
global.ResizeObserver = require('resize-observer-polyfill');

const autoPreview = env.parsed?.JEST_PREVIEW_AUTO ? env.parsed.JEST_PREVIEW_AUTO === 'true' : false;
jestPreviewConfigure({ autoPreview });

testingLibraryConfigure({
  asyncUtilTimeout: env.parsed?.WAITFOR_TIMEOUT ? parseInt(env.parsed.WAITFOR_TIMEOUT, 10) : 15000,
});

jest.mock('src/features/applicationMetadata', () => ({
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  ...jest.requireActual<typeof import('src/features/applicationMetadata')>('src/features/applicationMetadata'),
  getApplicationMetadata: jest.fn(() => getApplicationMetadataMock()),
  useIsStateless: jest.fn(() => false),
}));

jest.mock('src/features/form/layoutSets', () => ({
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  ...jest.requireActual<typeof import('src/features/form/layoutSets')>('src/features/form/layoutSets'),
  getLayoutSets: jest.fn(() => getLayoutSetsMock().sets),
  getGlobalUiSettings: jest.fn(() => getLayoutSetsMock().uiSettings),
}));

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type TextResourcesProviderImport = typeof import('src/features/language/textResources/TextResourcesProvider');
jest.mock<TextResourcesProviderImport>('src/features/language/textResources/TextResourcesProvider', () => ({
  __esModule: true,
  ...jest.requireActual<TextResourcesProviderImport>('src/features/language/textResources/TextResourcesProvider'),
  useTextResources: jest.fn(() => getTextResourceMapMock()),
}));

jest.mock('src/queries/queries', () => ({
  ...jest.requireActual<AppQueries>('src/queries/queries'),
  fetchProcessState: jest.fn<typeof fetchProcessState>(async () => getProcessDataMock()),
  doProcessNext: jest.fn<typeof doProcessNext>(async () => ({ data: getProcessDataMock() }) as AxiosResponse<IProcess>),
  fetchUserProfile: jest.fn<typeof fetchUserProfile>(async () => getProfileMock()),
  fetchInstanceData: jest.fn<typeof fetchInstanceData>(async () => getInstanceDataMock()),
  doUpdateAttachmentTags: jest.fn<typeof doUpdateAttachmentTags>(async ({ setTagsRequest }) => ({
    tags: setTagsRequest.tags,
  })),
}));
