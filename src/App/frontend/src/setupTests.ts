import '@testing-library/jest-dom/vitest';
import 'core-js/stable/structured-clone'; // https://github.com/jsdom/jsdom/issues/3363
import '@digdir/designsystemet-css';
import '@digdir/designsystemet-css/theme';

import { configure as testingLibraryConfigure } from '@testing-library/dom';
import dotenv from 'dotenv';
import ResizeObserver from 'resize-observer-polyfill';
import { vi } from 'vitest';
import type { AxiosResponse } from 'axios';

import { getApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { getApplicationSettingsMock } from 'src/__mocks__/getApplicationSettingsMock';
import { getFooterLayoutMock } from 'src/__mocks__/getFooterLayoutMock';
import { getInstanceWithProcessMock } from 'src/__mocks__/getInstanceDataMock';
import { getPartyMock } from 'src/__mocks__/getPartyMock';
import { getProfileMock } from 'src/__mocks__/getProfileMock';
import { getTextResourcesMock } from 'src/__mocks__/getTextResourcesMock';
import { getUiConfigMock } from 'src/__mocks__/getUiConfigMock';
import { GlobalData } from 'src/GlobalData';
import type { IInstanceWithProcess } from 'src/core/api-client/instance.api';
import type { doProcessNext, doUpdateAttachmentTags } from 'src/queries/queries';
import type { AppQueries } from 'src/queries/types';

import 'src/index.css';
import 'src/styles/shared.css';

const env = dotenv.config({ quiet: true });

// DOM Testing Library currently detects fake timers through the Jest-compatible global name.
// Point it at Vitest so waitFor advances vi.useFakeTimers() instead of waiting indefinitely.
Object.assign(globalThis, { jest: vi });

// https://jestjs.io/docs/manual-mocks#mocking-methods-which-are-not-implemented-in-jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

if (!document.fonts) {
  Object.defineProperty(document, 'fonts', {
    configurable: true,
    value: { ready: Promise.resolve({}) },
  });
}

if (!window.localStorage) {
  const values = new Map<string, string>();
  const localStorage: Storage = {
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
  Object.defineProperty(window, 'localStorage', { configurable: true, value: localStorage });
}

// https://github.com/jsdom/jsdom/issues/3002
Element.prototype.getClientRects = () => ({
  item: () => null,
  length: 0,
  [Symbol.iterator]: vi.fn(),
});

// Forcing a low timeout for useDelayedSaveState()
global.delayedSaveState = 50;

window.forceLayoutPropertiesValidation = 'off';

window.inUnitTest = true;

// org and app is assigned to window object, so to avoid 'undefined' in tests, they need to be set
window.org = 'ttd';
window.app = 'test';

// Set up altinnAppGlobalData with default mocks before each test to prevent pollution between tests

beforeEach(() => {
  GlobalData.setSelectedParty(undefined);
  window.altinnAppGlobalData = {
    applicationMetadata: getApplicationMetadataMock(),
    frontendSettings: getApplicationSettingsMock(),
    platformFrontendSettings: {
      postalCodesUrl: 'https://altinncdn.no/postcodes/registry.json',
      altinnLogoUrl: 'https://altinncdn.no/img/Altinn-logo-blue.svg',
      helpCircleIllustrationUrl: 'https://altinncdn.no/img/illustration-help-circle.svg',
      logoutUrl: 'https://platform.tt02.altinn.no/authentication/api/v1/logout',
      loginUrl: 'https://platform.tt02.altinn.no/authentication/api/v1/authentication?goto={goTo}',
      upgradeAuthenticationLevelUrl:
        'https://platform.tt02.altinn.no/authentication/api/v1/authentication?goTo={goTo}&acr_values=idporten-loa-high',
      arbeidsflateInboxUrl: 'https://af.tt02.altinn.no/',
      arbeidsflateDialogUrl: 'https://af.tt02.altinn.no/inbox/{dialogId}',
      arbeidsflateProfileUrl: 'https://af.tt02.altinn.no/profile',
      accessManagementChangeAndRedirectUrl:
        'https://am.ui.tt02.altinn.no/accessmanagement/api/v1/reportee/changeandredirect?partyId={partyId}&goTo={goTo}',
    },
    footer: getFooterLayoutMock(),
    ui: getUiConfigMock(),
    userProfile: getProfileMock(),
    availableLanguages: [{ language: 'nb' }],
    selectedParty: getPartyMock(),
    textResources: { language: 'nb', resources: getTextResourcesMock() },
  };
});

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

vi.mock('axios', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports -- importOriginal needs the module namespace shape
  const actual = await importOriginal<typeof import('axios')>();
  const pendingRequest = vi.fn(() => new Promise(() => undefined));
  const mockAxios = Object.assign(vi.fn(), {
    create: vi.fn(),
    delete: pendingRequest,
    get: pendingRequest,
    head: pendingRequest,
    interceptors: {
      request: { eject: vi.fn(), use: vi.fn() },
      response: { eject: vi.fn(), use: vi.fn() },
    },
    isAxiosError: actual.default.isAxiosError,
    options: pendingRequest,
    patch: pendingRequest,
    post: pendingRequest,
    put: pendingRequest,
    request: pendingRequest,
  });
  mockAxios.create.mockReturnValue(mockAxios);

  return { ...actual, default: mockAxios };
});

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

global.ResizeObserver = ResizeObserver;

testingLibraryConfigure({
  asyncUtilTimeout: env.parsed?.WAITFOR_TIMEOUT ? parseInt(env.parsed.WAITFOR_TIMEOUT, 10) : 15000,
});

vi.mock('src/queries/queries', async () => ({
  ...(await vi.importActual<AppQueries>('src/queries/queries')),
  doProcessNext: vi.fn<typeof doProcessNext>(
    async () => ({ data: getInstanceWithProcessMock() }) as AxiosResponse<IInstanceWithProcess>,
  ),
  doUpdateAttachmentTags: vi.fn<typeof doUpdateAttachmentTags>(async ({ setTagsRequest }) => ({
    tags: setTagsRequest.tags,
  })),
}));
