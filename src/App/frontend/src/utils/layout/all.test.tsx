import React from 'react';
import type { PropsWithChildren } from 'react';

import { jest } from '@jest/globals';
import { screen } from '@testing-library/react';
import dotenv from 'dotenv';
import layoutSchema from 'schemas/json/layout/layout.schema.v1.json';
import type { JSONSchema7 } from 'json-schema';

import { ignoredConsoleMessages } from 'test/e2e/support/fail-on-console-log';

import { getApplicationMetadata } from 'src/features/applicationMetadata';
import { getGlobalUiSettings, getLayoutSets } from 'src/features/form/layoutSets';
import { GenericComponent } from 'src/layout/GenericComponent';
import { SubformWrapper } from 'src/layout/Subform/SubformWrapper';
import { fetchInstanceData, fetchProcessState } from 'src/queries/queries';
import { ensureAppsDirIsSet, getAllApps } from 'src/test/allApps';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { GlobalPageSettings } from 'src/features/form/layoutSets/types';
import type { ExternalAppLayoutSet } from 'src/test/allApps';

const env = dotenv.config({ quiet: true });
const ENV: 'prod' | 'all' = env.parsed?.ALTINN_ALL_APPS_ENV === 'prod' ? 'prod' : 'all';
const MODE: 'critical' | 'all' = env.parsed?.ALTINN_ALL_APPS_MODE === 'critical' ? 'critical' : 'all';

const ignoreLogAndErrors = [
  ...ignoredConsoleMessages,
  'The above error occurred in the',
  ...(MODE === 'critical'
    ? [
        'Warning: validateDOMNesting', // A more generic variant from the one in ignoredConsoleMessages
        'er ikke tillatt i `textResourceBindings`',
        'Egenskapen `pageRef` er ikke tillatt',
        'samsvarer ikke med mønsteret `^[0-9a-zA-Z][',
        /Målet for oppsummeringen \([^)]*\) ble ikke funnet/,
        'because an invalid file extension was provided',
        'Egenskapen `renderAsSummary` er ikke tillatt',
      ]
    : []),
];

function TestApp() {
  const errors = NodesInternal.useFullErrorList();
  const filteredErrors: Record<string, string[]> = {};

  for (const key in errors) {
    const filtered = errors[key].filter(
      (err) =>
        !ignoreLogAndErrors.some((ignore) => (ignore instanceof RegExp ? ignore.test(err) : err.includes(ignore))),
    );
    if (filtered.length) {
      filteredErrors[key] = filtered;
    }
  }

  return <div data-testid='errors'>{JSON.stringify(filteredErrors)}</div>;
}

function RenderAllComponents() {
  const state = NodesInternal.useStore().getState();
  const all = Object.values(state.nodeData)
    .filter((nodeData) => nodeData.isValid && nodeData.parentId === undefined)
    .map((nodeData) => nodeData.id);

  return (
    <>
      {all.map((id) => (
        <GenericComponent
          baseComponentId={id}
          key={id}
        />
      ))}
      <TestApp />
    </>
  );
}

/**
 * Makes sure we go one level deeper into the subform context when testing subforms
 */
function SubformTestWrapper({ baseId, children }: PropsWithChildren<{ baseId: string }>) {
  return <SubformWrapper baseComponentId={baseId}>{children}</SubformWrapper>;
}

const windowLoggers = ['logError', 'logErrorOnce', 'logWarn', 'logWarnOnce', 'logInfo', 'logInfoOnce'];
const consoleLoggers = ['error', 'warn', 'log'];

describe('All known layout sets should evaluate as a hierarchy', () => {
  let pathnameWas: string;
  beforeAll(() => {
    window.forceNodePropertiesValidation = 'on';
    pathnameWas = window.location.pathname.toString();
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
    window.location.pathname = pathnameWas;
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

  // Randomize the order of the tests so we don't have to wait for the same first ones every time
  allSets.sort(() => Math.random() - 0.5);

  async function testSet(set: ExternalAppLayoutSet) {
    const { pathname, mainSet, subformComponent } = set.initialize();
    window.location.pathname = pathname;
    const [org, app] = set.app.getOrgApp();
    window.org = org;
    window.app = app;

    jest.mocked(getApplicationMetadata).mockImplementation(() => set.app.getAppMetadata());
    jest.mocked(getLayoutSets).mockReturnValue(set.app.getRawLayoutSets().sets);
    // Real apps have backend-populated uiSettings, cast to GlobalPageSettings
    jest.mocked(getGlobalUiSettings).mockReturnValue(set.app.getRawLayoutSets().uiSettings as GlobalPageSettings);
    jest.mocked(fetchProcessState).mockImplementation(async () => mainSet.simulateProcessData());
    jest.mocked(fetchInstanceData).mockImplementation(async () => set.simulateInstance());

    const children = env.parsed?.ALTINN_ALL_APPS_RENDER_COMPONENTS === 'true' ? <RenderAllComponents /> : <TestApp />;
    await renderWithInstanceAndLayout({
      taskId: mainSet.getTaskId(),
      renderer: () =>
        subformComponent ? <SubformTestWrapper baseId={subformComponent.id}>{children}</SubformTestWrapper> : children,
      queries: {
        fetchLayouts: async (setId) => set.app.getLayoutSet(setId).getLayouts(),
        fetchLayoutSettings: async (setId) => set.app.getLayoutSet(setId).getSettings(),
        fetchFormData: async (url) => set.getModel({ url }).simulateDataModel(),
        fetchDataModelSchema: async (name) => set.getModel({ name }).getSchema(),
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
    // eslint-disable-next-line no-console
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

  it.each(allSets)('$appName/$setName', async ({ set }) => testSet(set));
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
          shouldIgnore = ignoreLogAndErrors.some((remove) =>
            remove instanceof RegExp ? remove.test(arg) : arg.includes(remove),
          );
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
