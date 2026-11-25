import { waitFor } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import type { JSONSchema7 } from 'json-schema';
import type { Mock } from 'vitest';

import { getApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { getDataModelBootstrapMock, getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import { getProcessDataMock } from 'src/__mocks__/getProcessDataMock';
import { getLayoutSettingsMock } from 'src/__mocks__/getUiConfigMock';
import {
  calculationTestSchemaFile,
  calculationTestsPath,
  getCalculationTestCases,
  getSharedCalculationTests,
} from 'src/features/expressions/shared';
import { FormStore } from 'src/features/form/FormContext';
import { ALTINN_ROW_ID } from 'src/features/formData/types';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type { CalculationTestCase, DataModelAndElement } from 'src/features/expressions/shared';
import type { FormStoreApi } from 'src/features/form/FormContext';
import type { RawDataModelInfo } from 'src/features/formBootstrap/types';
import type { IData, IDataType } from 'src/types/shared';

/** The placeholder for the id of a row the calculation adds */
const NEW_ROW_ID = '<new>';

const schema: JSONSchema7 = JSON.parse(
  fs.readFileSync(path.join(calculationTestsPath, calculationTestSchemaFile)).toString(),
);

const files = getSharedCalculationTests();

function getDataModels({ dataModel, dataModels }: CalculationTestCase): DataModelAndElement[] {
  if (dataModels) {
    return dataModels;
  }
  if (dataModel) {
    return [
      { dataElement: { id: '30844cc0-81af-4429-9f9e-035d78f1f9da', dataType: 'default' } as IData, data: dataModel },
    ];
  }
  throw new Error('The test has neither dataModel nor dataModels');
}

function getCalculations({ calculations }: CalculationTestCase, firstDataType: string): Record<string, unknown[]> {
  if (!calculations) {
    throw new Error('The test has no calculations');
  }
  return Array.isArray(calculations) ? { [firstDataType]: calculations } : calculations;
}

function getExpects(testCase: CalculationTestCase, dataModels: DataModelAndElement[]): Record<string, unknown> {
  if (!testCase.expects) {
    throw new Error('The test has no expects');
  }
  return testCase.dataModels
    ? (testCase.expects as Record<string, unknown>)
    : { [dataModels[0].dataElement.dataType]: testCase.expects };
}

function collectRowIds(value: unknown, ids: string[] = []): string[] {
  if (Array.isArray(value)) {
    value.forEach((item) => collectRowIds(item, ids));
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (key === ALTINN_ROW_ID && typeof child === 'string') {
        ids.push(child);
      } else {
        collectRowIds(child, ids);
      }
    }
  }
  return ids;
}

/** '<new>' or a labelled '<new:label>' as an altinnRowId in the expected data */
function isNewRowId(value: unknown): value is string {
  return typeof value === 'string' && (value === NEW_ROW_ID || (value.startsWith('<new:') && value.endsWith('>')));
}

function countPlaceholders(value: unknown, counts = new Map<string, number>()): Map<string, number> {
  if (Array.isArray(value)) {
    value.forEach((item) => countPlaceholders(item, counts));
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (key === ALTINN_ROW_ID && isNewRowId(child)) {
        counts.set(child, (counts.get(child) ?? 0) + 1);
      } else {
        countPlaceholders(child, counts);
      }
    }
  }
  return counts;
}

/**
 * Replaces each placeholder row id in the expected data with the id at the same place in the actual data when it
 * matches, so the comparison passes there. An id matched by a placeholder is not in the input data. '<new>' matches
 * an id no other row in the result has, and every '<new:label>' with the same label matches one id, which the rows
 * with that label have and no other row has, such as a new row and its copy. Otherwise the placeholder stays, and the
 * comparison fails at that row.
 */
function resolveNewRowIds(expected: unknown, actual: unknown, inputIds: string[], actualIds: string[]): unknown {
  const counts = countPlaceholders(expected);
  const idsByPlaceholder = new Map<string, string>();
  function matches(placeholder: string, actualId: unknown): actualId is string {
    if (typeof actualId !== 'string' || actualId.length === 0 || inputIds.includes(actualId)) {
      return false;
    }
    const count = placeholder === NEW_ROW_ID ? 1 : (counts.get(placeholder) ?? 0);
    if (actualIds.filter((id) => id === actualId).length !== count) {
      return false;
    }
    if (placeholder !== NEW_ROW_ID && (idsByPlaceholder.get(placeholder) ?? actualId) !== actualId) {
      return false;
    }
    idsByPlaceholder.set(placeholder, actualId);
    return true;
  }
  function resolve(expectedValue: unknown, actualValue: unknown): unknown {
    if (Array.isArray(expectedValue)) {
      return expectedValue.map((item, index) =>
        resolve(item, Array.isArray(actualValue) ? actualValue[index] : undefined),
      );
    }
    if (expectedValue && typeof expectedValue === 'object') {
      const actualObject =
        actualValue && typeof actualValue === 'object' ? (actualValue as Record<string, unknown>) : {};
      return Object.fromEntries(
        Object.entries(expectedValue).map(([key, value]) => {
          const actualChild = actualObject[key];
          if (key === ALTINN_ROW_ID && isNewRowId(value) && matches(value, actualChild)) {
            return [key, actualChild];
          }
          return [key, resolve(value, actualChild)];
        }),
      );
    }
    return expectedValue;
  }
  return resolve(expected, actual);
}

function messagesOf(mock: Mock): string[] {
  return mock.mock.calls.map((args) => args.map((arg) => (arg instanceof Error ? arg.message : String(arg))).join(' '));
}

function getErrors(): string[] {
  return [...messagesOf(window.logError as Mock), ...messagesOf(window.logErrorOnce as Mock)];
}

/** A calculation that throws, such as for duplicate row ids, ends up in the router error boundary */
function getErrorBoundaryText(): string | undefined {
  return document.body.textContent?.includes('Unexpected Application Error')
    ? (document.body.textContent ?? undefined)
    : undefined;
}

async function renderCalculations(testCase: CalculationTestCase, dataModels: DataModelAndElement[]) {
  const expectsFailure = testCase.expectsFailure !== undefined;
  const calculations = getCalculations(testCase, dataModels[0].dataElement.dataType);
  const dataElements = dataModels.map(({ dataElement }) => ({ ...dataElement, locked: false }) as IData);

  window.altinnAppGlobalData.applicationMetadata = getApplicationMetadataMock((metadata) => {
    metadata.dataTypes.push(
      ...dataElements.map(
        (dataElement) =>
          ({
            id: dataElement.dataType,
            appLogic: { classRef: 'Altinn.App.Models.CalculationTestModel' },
            taskIds: ['Task_1'],
            maxCount: 1,
          }) as IDataType,
      ),
    );
  });
  window.altinnAppGlobalData.ui.folders.Task_1 = getLayoutSettingsMock({
    defaultDataType: dataElements[0].dataType,
  });

  let store: FormStoreApi | undefined;
  function Snapshot() {
    store = FormStore.raw.useStore();
    return null;
  }
  await renderWithInstanceAndLayout({
    renderer: () => <Snapshot />,
    // A failure can stop the form from loading, so a failing case waits for the failure instead
    waitUntilLoaded: !expectsFailure,
    queries: {
      getInstance: async () => ({
        ...getInstanceDataMock((instance) => {
          instance.data.push(...dataElements);
        }),
        process: getProcessDataMock(),
      }),
      fetchFormBootstrapForInstance: async () =>
        getFormBootstrapMock((bootstrap) => {
          bootstrap.dataModels = {};
          for (const { dataElement, data } of dataModels) {
            const config = calculations[dataElement.dataType];
            bootstrap.dataModels[dataElement.dataType] = getDataModelBootstrapMock({
              schema,
              initialData: structuredClone(data),
              dataElementId: dataElement.id,
              // The raw configuration, which the bootstrap query validates like the backend parses it
              ...(config
                ? { calculationConfig: { calculations: config } as RawDataModelInfo['calculationConfig'] }
                : {}),
            });
          }
        }),
    },
  });
  if (expectsFailure) {
    await waitFor(() => expect(getErrors().length > 0 || getErrorBoundaryText() !== undefined).toBe(true));
    return undefined;
  }
  await waitFor(() => expect(store).toBeDefined());
  return store!;
}

/** Every expected substring must match a message, and every message must match one of them */
function expectMatching(kind: string, messages: string[], expected: string[] = []) {
  for (const substring of expected) {
    expect(messages).toContainEqual(expect.stringContaining(substring));
  }
  for (const message of messages) {
    expect(
      expected.some((substring) => message.includes(substring)),
      `Unexpected ${kind}: ${message}`,
    ).toBe(true);
  }
}

describe('Shared calculation tests', () => {
  beforeEach(() => {
    vi.spyOn(window, 'logError').mockImplementation(() => {});
    vi.spyOn(window, 'logErrorOnce').mockImplementation(() => {});
    vi.spyOn(window, 'logWarn').mockImplementation(() => {});
    vi.spyOn(window, 'logWarnOnce').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('finds the shared calculation tests', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  // The backend runner rejects unknown properties too, so a misspelled expectation cannot pass silently
  it.each(files)('$file has only known properties', ({ test }) => {
    const known = [
      'name',
      'comment',
      'disabledFrontend',
      'disabledBackend',
      'dataModel',
      'dataModels',
      'calculations',
      'expects',
      'expectsBackend',
      'expectsFailure',
      'expectsFailureBackend',
      'expectsWarnings',
      'expectsErrors',
    ];
    expect(Object.keys(test).filter((key) => ![...known, 'testCases'].includes(key))).toEqual([]);
    for (const testCase of test.testCases ?? []) {
      expect(Object.keys(testCase).filter((key) => !known.includes(key))).toEqual([]);
    }
  });

  // expectsFailureBackend may stand next to expects: the backend fails with it, and the frontend gets the result
  it.each(files)('$file has one kind of expectation in each case', ({ test }) => {
    for (const testCase of getCalculationTestCases(test)) {
      expect(testCase.expects === undefined || testCase.expectsFailure === undefined, testCase.name).toBe(true);
      expect(testCase.expects !== undefined || testCase.expectsFailure !== undefined, testCase.name).toBe(true);
      expect(testCase.expectsErrors === undefined || testCase.expects !== undefined, testCase.name).toBe(true);
      expect(testCase.expectsBackend === undefined || testCase.expects !== undefined, testCase.name).toBe(true);
    }
  });

  describe.each(files)('$file', ({ test }) => {
    const cases = getCalculationTestCases(test).filter(
      (testCase) => !testCase.disabledFrontend || process.env.RUN_DISABLED,
    );
    if (cases.length === 0) {
      it.skip('is disabled in the frontend', () => {});
      return;
    }
    it.each(cases)('$name', async (testCase) => {
      const dataModels = getDataModels(testCase);
      let store: FormStoreApi | undefined;
      let thrown: unknown;
      if (testCase.expectsFailure !== undefined) {
        // React reports the error that the router error boundary catches
        vi.spyOn(console, 'error').mockImplementation(() => {});
      }
      try {
        store = await renderCalculations(testCase, dataModels);
      } catch (error) {
        thrown = error;
      }
      const boundary = getErrorBoundaryText();
      const errors = [
        ...(thrown ? [thrown instanceof Error ? thrown.message : String(thrown)] : []),
        ...(boundary ? [boundary] : []),
        ...getErrors(),
      ];
      const warnings = [...messagesOf(window.logWarn as Mock), ...messagesOf(window.logWarnOnce as Mock)];

      if (testCase.expectsFailure !== undefined) {
        expect(errors).toContainEqual(expect.stringContaining(testCase.expectsFailure));
        return;
      }

      expectMatching('error', errors, testCase.expectsErrors);
      expectMatching('warning', warnings, testCase.expectsWarnings);

      const expects = getExpects(testCase, dataModels);
      for (const { dataElement, data } of dataModels) {
        // Compared as the JSON the frontend saves, so a property set to undefined counts as missing
        const actual = JSON.parse(JSON.stringify(store!.getState().data.models[dataElement.dataType].currentData));
        const expected = resolveNewRowIds(
          expects[dataElement.dataType],
          actual,
          collectRowIds(data),
          collectRowIds(actual),
        );
        expect({ [dataElement.dataType]: actual }).toEqual({ [dataElement.dataType]: expected });
      }
    });
  });
});
