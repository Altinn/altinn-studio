/* eslint-disable no-console */
import React from 'react';

import { jest } from '@jest/globals';
import { screen } from '@testing-library/react';
import dotenv from 'dotenv';
import layoutSchema from 'schemas/json/layout/layout.schema.v1.json';
import type { JSONSchema7 } from 'json-schema';

import { quirks } from 'src/features/form/layout/quirks';
import { fetchApplicationMetadata } from 'src/queries/queries';
import { ensureAppsDirIsSet, getAllApps } from 'src/test/allApps';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { ExternalAppLayoutSet } from 'src/test/allApps';

const env = dotenv.config();
const ENV: 'prod' | 'all' = env.parsed?.ALTINN_ALL_APPS_ENV === 'prod' ? 'prod' : 'all';
const MODE: 'critical' | 'all' = env.parsed?.ALTINN_ALL_APPS_MODE === 'critical' ? 'critical' : 'all';

const ignoreLogAndErrors = [
  'DEPRECATED: option jsPropertySyntax',
  'Warning: findDOMNode is deprecated and will be removed in the next major release',
  'The above error occurred in the',
  'Layout quirk(s) applied',
  ...(MODE === 'critical'
    ? [
        'er ikke tillatt i `textResourceBindings`',
        'Egenskapen `pageRef` er ikke tillatt',
        'samsvarer ikke med mønsteret `^[0-9a-zA-Z][',
      ]
    : []),
];

function TestApp() {
  const errors = NodesInternal.useFullErrorList();
  const filteredErrors: Record<string, string[]> = {};

  for (const key in errors) {
    const filtered = errors[key].filter((err) => !ignoreLogAndErrors.some((ignore) => err.includes(ignore)));
    if (filtered.length) {
      filteredErrors[key] = filtered;
    }
  }

  return <div data-testid='errors'>{JSON.stringify(filteredErrors)}</div>;
}

const windowLoggers = ['logError', 'logErrorOnce', 'logWarn', 'logWarnOnce', 'logInfo', 'logInfoOnce'];
const consoleLoggers = ['error', 'warn', 'log'];

describe('All known layout sets should evaluate as a hierarchy', () => {
  let hashWas: string;
  beforeAll(() => {
    window.forceNodePropertiesValidation = 'on';
    hashWas = window.location.hash.toString();
    for (const func of windowLoggers) {
      jest
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(global, func as any)
        .mockImplementation(() => {})
        .mockName(`global.${func}`);
    }
    for (const func of consoleLoggers) {
      jest
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(console, func as any)
        .mockImplementation(() => {})
        .mockName(`console.${func}`);
    }
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    window.forceNodePropertiesValidation = 'off';
    window.location.hash = hashWas;
    jest.restoreAllMocks();
  });

  const dir = ensureAppsDirIsSet();
  if (!dir) {
    return;
  }

  const allSets = getAllApps(dir)
    .filter((app) => app.isValid())
    .filter((app) => (ENV === 'prod' ? app.getName().match(/^\w+-prod-.*$/) : true))
    .map((app) => app.enableCompatibilityMode().getLayoutSets())
    .flat()
    .filter((set) => set.isValid())
    .map((set) => ({ appName: set.app.getName(), setName: set.getName(), set }));

  const appsToSkip = ['multiple-datamodels-test'];
  const filteredSets = allSets.filter(
    ({ set }) => !appsToSkip.map((app) => set.app.getName().includes(app)).some((x) => x),
  );

  async function testSet(set: ExternalAppLayoutSet) {
    window.location.hash = set.simulateValidUrlHash();
    const [org, app] = set.app.getOrgApp();
    window.org = org;
    window.app = app;

    (fetchApplicationMetadata as jest.Mock<typeof fetchApplicationMetadata>).mockImplementation(() =>
      Promise.resolve(set.app.getAppMetadata()),
    );
    await renderWithInstanceAndLayout({
      renderer: () => <TestApp />,
      queries: {
        fetchLayoutSets: async () => set.getLayoutSetsAsOnlySet(),
        fetchLayouts: async () => set.getLayouts(),
        fetchLayoutSettings: async () => set.getSettings(),
        fetchFormData: async () => set.getModel().simulateDataModel(),
        fetchDataModelSchema: async () => set.getModel().getSchema(),
        fetchInstanceData: async () => set.simulateInstance(),
        fetchProcessState: async () => set.simulateProcess(),
        fetchLayoutSchema: async () => layoutSchema as unknown as JSONSchema7,
      },
      alwaysRouteToChildren: true,
    });

    // If errors are not found in the DOM, but there are errors in the loggers, output those instead
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let errors: any = {};
    let alwaysFail = false;
    try {
      const nodeErrors = (await screen.findByTestId('errors')).textContent;
      errors = JSON.parse(nodeErrors!);
      expect(typeof errors).toBe('object');
    } catch (err) {
      alwaysFail = err;
    }

    // Inject errors from console/window.logError into the full error list for this layout-set
    const devToolsLoggers = windowLoggers.map((func) => window[func] as jest.Mock);
    const browserLoggers = consoleLoggers.map((func) => console[func] as jest.Mock);
    for (const _mock of [...devToolsLoggers, ...browserLoggers]) {
      const mock = _mock as jest.Mock;
      const calls = filterAndCleanMockCalls(mock);
      if (calls.length) {
        errors[mock.getMockName()] = calls;
      }
    }

    expect(errors).toEqual({});
    expect(alwaysFail).toBe(false);
  }

  it.each(filteredSets)('$appName/$setName', async ({ set }) => testSet(set));

  if (env.parsed?.ALTINN_ALL_APPS_TEST_FOR_LAST_QUIRK === 'true') {
    it(`last quirk`, async () => {
      const lastQuirk = Object.keys(quirks).at(-1);
      const found = filteredSets.find(({ set }) => {
        const [org, app] = set.app.getOrgApp();
        return `${org}/${app}/${set.getName()}` === lastQuirk;
      });

      if (found) {
        await testSet(found.set);
      }
    });
  }
});

function filterAndCleanMockCalls(mock: jest.Mock): string[] {
  return mock.mock.calls
    .map((_call) => {
      let shouldIgnore = false;
      const call = [..._call];
      for (const idx in call) {
        const arg = call[idx];
        if (!arg || shouldIgnore) {
          continue;
        }
        if (typeof arg === 'string') {
          shouldIgnore = ignoreLogAndErrors.some((remove) => arg.includes(remove));
          if (shouldIgnore) {
            continue;
          }

          // Remove line 2+ when string is an error with a full backtrace
          if (parseInt(idx, 10) > 0 && arg.match(/^\n\s+at /)) {
            call.length = parseInt(idx, 10) - 1;
            break;
          }
        }
        if (arg instanceof Error) {
          call[idx] = arg.message;
        }
      }

      if (shouldIgnore) {
        return undefined;
      }

      const out = call.filter((arg) => !!arg);
      if (out.length) {
        return out;
      }
      return undefined;
    })
    .filter((x) => x)
    .map((x) => (x ?? []).join('\n'));
}
