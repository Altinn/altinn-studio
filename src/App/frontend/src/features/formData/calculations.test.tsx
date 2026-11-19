import React from 'react';

import { act, waitFor } from '@testing-library/react';
import type { JSONSchema7 } from 'json-schema';

import { getDataModelBootstrapMock, getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { defaultDataTypeMock, getLayoutSettingsMock } from 'src/__mocks__/getUiConfigMock';
import { SchemaLookupTool } from 'src/features/datamodel/SchemaLookupTool';
import { FormStore } from 'src/features/form/FormContext';
import { resolveCalculationConfig, resolveCalculationTargets } from 'src/features/formData/calculations';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type { FormStoreApi } from 'src/features/form/FormContext';
import type { CalculationConfig } from 'src/features/formData/calculations';

const schema: JSONSchema7 = {
  type: 'object',
  properties: {
    quantity: { type: 'number' },
    total: { type: 'number' },
    label: { type: 'string' },
    enabled: { type: 'boolean' },
    nullableNumber: { type: ['number', 'null'] },
    wrappedNullableNumber: { anyOf: [{ type: 'number', enum: [0, 1] }, { type: 'null' }] },
    nullableBoolean: { oneOf: [{ type: 'boolean' }, { type: 'null' }] },
    numbers: { type: 'array', items: { type: 'number' } },
    strings: { type: 'array', items: { type: 'string' } },
    rows: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          price: { type: 'number' },
          quantity: { type: 'number' },
          total: { type: 'number' },
          children: { type: 'array', items: { type: 'object', properties: { label: { type: 'string' } } } },
        },
      },
    },
    copies: {
      type: 'array',
      items: {
        type: 'object',
        properties: { price: { type: 'number' }, quantity: { type: 'number' }, total: { type: 'number' } },
      },
    },
    summary: {
      type: 'object',
      properties: { Total: { type: 'number' }, Rows: { type: 'integer' }, Label: { type: 'string' } },
    },
    missingObject: { type: 'object', properties: { label: { type: 'string' } } },
  },
};

const isUuid = expect.stringMatching(/^[0-9a-f-]{36}$/);
// Row ids are GUIDs, as the backend stores them
const rowIdA = 'a0000000-0000-4000-8000-00000000000a';
const rowIdB = 'a0000000-0000-4000-8000-00000000000b';
const rowIdC = 'a0000000-0000-4000-8000-00000000000c';
const rowIdCopyA = 'c0000000-0000-4000-8000-00000000000a';

async function renderCalculations(
  config: CalculationConfig,
  initialData: object,
  otherModel = false,
  previewOtherTask = false,
) {
  let store: FormStoreApi | undefined;
  function Snapshot() {
    store = FormStore.raw.useStore();
    return null;
  }
  window.altinnAppGlobalData.ui.settings!.autoSaveBehavior = 'onChangePage';
  if (previewOtherTask) {
    window.altinnAppGlobalData.ui.folders.Task_Pdf = getLayoutSettingsMock({ defaultDataType: defaultDataTypeMock });
  }
  const rendered = await renderWithInstanceAndLayout({
    renderer: () => <Snapshot />,
    taskId: previewOtherTask ? 'Task_Pdf' : undefined,
    query: previewOtherTask ? 'pdf=1' : undefined,
    queries: {
      fetchFormBootstrapForInstance: async () =>
        getFormBootstrapMock((bootstrap) => {
          bootstrap.dataModels[defaultDataTypeMock] = getDataModelBootstrapMock({
            schema,
            initialData,
            calculationConfig: config,
          });
          if (otherModel) {
            bootstrap.dataModels.other = getDataModelBootstrapMock({
              schema,
              initialData: { quantity: 3 },
              dataElementId: null,
            });
          }
        }),
    },
  });
  await waitFor(() => expect(store).toBeDefined());
  if (!store) {
    throw new Error('Form store did not mount');
  }
  return { store, ...rendered };
}

describe('calculation targets', () => {
  const lookup = new SchemaLookupTool(schema, '');
  it('resolves missing objects and leaves, but skips missing arrays and null rows', () => {
    expect(resolveCalculationTargets('missingObject.label', {}, lookup)).toEqual(['missingObject.label']);
    expect(resolveCalculationTargets('rows.total', {}, lookup)).toEqual([]);
    expect(resolveCalculationTargets('rows.total', { rows: [null, {}] }, lookup)).toEqual(['rows[1].total']);
    expect(resolveCalculationTargets('unknown.label', {}, lookup)).toEqual([]);
  });

  it('supports nested groups, explicit indices, and empty brackets', () => {
    const data = { rows: [{ children: [{}] }, { children: [{}, {}] }] };
    expect(resolveCalculationTargets('rows.children.label', data, lookup)).toEqual([
      'rows[0].children[0].label',
      'rows[1].children[0].label',
      'rows[1].children[1].label',
    ]);
    expect(resolveCalculationTargets('rows[1].children[].label', data, lookup)).toEqual([
      'rows[1].children[0].label',
      'rows[1].children[1].label',
    ]);
    expect(resolveCalculationTargets('rows[9].total', data, lookup)).toEqual([]);
  });
});

describe('calculations in the form store', () => {
  it('writes and clears a calculated number through the nullable schema produced by the upgrader', async () => {
    const { store } = await renderCalculations(
      {
        calculations: [
          { field: 'wrappedNullableNumber', expression: ['if', ['dataModel', 'enabled'], 1, 'else', null] },
        ],
      },
      { enabled: true },
    );
    expect(store.getState().data.models[defaultDataTypeMock].currentData.wrappedNullableNumber).toBe(1);

    act(() => {
      store
        .getState()
        .data.setLeafValue({ reference: { dataType: defaultDataTypeMock, field: 'enabled' }, newValue: false });
      store.getState().data.debounce('forced');
    });

    expect(store.getState().data.models[defaultDataTypeMock].currentData.wrappedNullableNumber ?? null).toBeNull();
  });

  it('preserves stored values when a PDF previews another task with calculations', async () => {
    const initialData = { quantity: 4, total: 3 };
    const { store } = await renderCalculations(
      { calculations: [{ field: 'total', expression: ['multiply', ['dataModel', 'quantity'], 2] }] },
      initialData,
      false,
      true,
    );

    expect(store.getState().readOnly).toBe(true);
    expect(store.getState().data.models[defaultDataTypeMock].currentData).toEqual(initialData);
    act(() => store.getState().data.debounce('forced'));
    expect(store.getState().data.models[defaultDataTypeMock].debouncedCurrentData).toEqual(initialData);
  });

  it('calculates initial data, converts scalar types, and runs dependent expressions in order', async () => {
    const { store } = await renderCalculations(
      {
        calculations: [
          { field: 'total', expression: ['multiply', ['dataModel', 'quantity'], 2] },
          { field: 'label', expression: ['dataModel', 'total'] },
          { field: 'enabled', expression: ['greaterThan', ['dataModel', 'total'], 0] },
        ],
      },
      { quantity: 4 },
    );
    expect(store.getState().data.models[defaultDataTypeMock].currentData).toEqual({
      quantity: 4,
      total: 8,
      label: '8',
      enabled: true,
    });
    const { setLeafValue, debounce } = store.getState().data;
    act(() => {
      setLeafValue({ reference: { dataType: defaultDataTypeMock, field: 'quantity' }, newValue: 0 });
      debounce('forced');
    });
    const model = store.getState().data.models[defaultDataTypeMock];
    expect(model.currentData).toEqual({ quantity: 0, total: 0, label: '0', enabled: false });
    expect(model.currentData).toBe(model.debouncedCurrentData);
  });

  it('reads cross-model changes and recalculates when the backend changes an input', async () => {
    const { store } = await renderCalculations(
      {
        calculations: [{ field: 'total', expression: ['multiply', ['dataModel', 'quantity', 'other'], 2] }],
      },
      {},
      true,
    );
    expect(store.getState().data.models[defaultDataTypeMock].currentData).toEqual({ total: 6 });
    act(() => {
      store.getState().data.setLeafValue({ reference: { dataType: 'other', field: 'quantity' }, newValue: 5 });
      store.getState().data.debounce('forced');
    });
    expect(store.getState().data.models[defaultDataTypeMock].currentData).toEqual({ total: 10 });
    act(() => {
      store.getState().data.saveFinished({
        savedData: { [defaultDataTypeMock]: { total: 10 }, other: { quantity: 5 } },
        newDataModels: [{ data: { quantity: 7 }, dataType: 'other', dataElementId: undefined }],
        validationIssues: undefined,
      });
    });
    expect(store.getState().data.models[defaultDataTypeMock].currentData).toEqual({ total: 14 });
  });

  it('calculates relative to each nested row, supplies the target path, and updates totals after deleting rows', async () => {
    const { store } = await renderCalculations(
      {
        calculations: [
          {
            field: 'rows.total',
            expression: ['multiply', ['dataModel', 'rows.price'], ['dataModel', 'rows.quantity']],
          },
          { field: 'rows.children.label', expression: ['argv', 0] },
          { field: 'total', expression: ['sum', ['jmespath', ['dataModel', 'rows'], '[].total']] },
        ],
      },
      {
        rows: [
          { price: 2, quantity: 3, children: [{}] },
          { price: 5, quantity: 4, children: [{}] },
        ],
      },
    );
    expect(store.getState().data.models[defaultDataTypeMock].currentData).toEqual({
      rows: [
        { price: 2, quantity: 3, total: 6, children: [{ label: 'rows[0].children[0].label' }] },
        { price: 5, quantity: 4, total: 20, children: [{ label: 'rows[1].children[0].label' }] },
      ],
      total: 26,
    });
    act(() => {
      store
        .getState()
        .data.removeIndexFromList({ reference: { dataType: defaultDataTypeMock, field: 'rows' }, index: 0 });
    });
    expect(store.getState().data.models[defaultDataTypeMock].currentData).toMatchObject({
      total: 20,
      rows: [{ children: [{ label: 'rows[0].children[0].label' }] }],
    });
  });

  it.each(['index', 'value'] as const)('recalculates immediately after removing a list item by %s', async (method) => {
    const { store } = await renderCalculations(
      { calculations: [{ field: 'total', expression: ['sum', ['dataModel', 'numbers']] }] },
      { numbers: [2, 3] },
    );
    expect(store.getState().data.models[defaultDataTypeMock].currentData).toEqual({ numbers: [2, 3], total: 5 });
    const reference = { dataType: defaultDataTypeMock, field: 'numbers' };
    act(() => {
      const data = store.getState().data;
      if (method === 'index') {
        data.removeIndexFromList({ reference, index: 0 });
      } else {
        data.removeValueFromList({ reference, value: 2 });
      }
    });
    const model = store.getState().data.models[defaultDataTypeMock];
    expect(model.currentData).toEqual({ numbers: [3], total: 3 });
    expect(model.debouncedCurrentData).toEqual({ numbers: [3], total: 3 });
  });

  it('clears a previous value when an expression returns null', async () => {
    const { store } = await renderCalculations(
      {
        calculations: [{ field: 'label', expression: ['if', ['dataModel', 'enabled'], 'yes', 'else', null] }],
      },
      { enabled: true },
    );
    act(() => {
      store
        .getState()
        .data.setLeafValue({ reference: { dataType: defaultDataTypeMock, field: 'enabled' }, newValue: false });
      store.getState().data.debounce('forced');
    });
    expect(store.getState().data.models[defaultDataTypeMock].currentData).toEqual({ enabled: false, label: null });
  });

  it('does not write in read-only forms', async () => {
    const { store } = await renderCalculations(
      { calculations: [{ field: 'total', expression: ['dataModel', 'quantity'] }] },
      { quantity: 2 },
    );
    act(() => store.setState({ readOnly: true }));
    act(() => {
      store
        .getState()
        .data.setLeafValue({ reference: { dataType: defaultDataTypeMock, field: 'quantity' }, newValue: 9 });
      store.getState().data.debounce('forced');
    });
    expect(store.getState().data.models[defaultDataTypeMock].currentData).toEqual({ quantity: 9, total: 2 });
  });

  it('clears nullable numeric and boolean targets without losing schema nullability', async () => {
    const { store } = await renderCalculations(
      {
        calculations: [
          { field: 'nullableNumber', expression: ['if', ['dataModel', 'enabled'], 3, 'else', null] },
          { field: 'nullableBoolean', expression: ['if', ['dataModel', 'enabled'], true, 'else', null] },
        ],
      },
      { enabled: true },
    );
    expect(store.getState().data.models[defaultDataTypeMock].currentData).toEqual({
      enabled: true,
      nullableNumber: 3,
      nullableBoolean: true,
    });
    act(() => {
      store
        .getState()
        .data.setLeafValue({ reference: { dataType: defaultDataTypeMock, field: 'enabled' }, newValue: false });
      store.getState().data.debounce('forced');
    });
    expect(store.getState().data.models[defaultDataTypeMock].currentData).toEqual({
      enabled: false,
      nullableNumber: null,
      nullableBoolean: null,
    });
  });

  it('clears numbers and booleans that the schema does not mark as nullable', async () => {
    const { store } = await renderCalculations(
      {
        calculations: [
          { field: 'total', expression: ['if', ['dataModel', 'enabled'], 3, 'else', null] },
          { field: 'enabled', expression: ['if', false, true, 'else', null] },
        ],
      },
      { enabled: true, total: 1 },
    );
    expect(store.getState().data.models[defaultDataTypeMock].currentData).toEqual({ enabled: null, total: 3 });
  });

  it('converts scalars with the rules expressions use for their arguments', async () => {
    const { store } = await renderCalculations(
      {
        calculations: [
          { field: 'total', expression: '1.5e3' },
          { field: 'quantity', expression: '-2.5' },
          { field: 'enabled', expression: 0 },
          { field: 'nullableBoolean', expression: '1' },
          { field: 'label', expression: 'null' },
          { field: 'strings', expression: ['list', 'TRUE', 2, false] },
        ],
      },
      { enabled: true },
    );
    expect(store.getState().data.models[defaultDataTypeMock].currentData).toEqual({
      total: 1500,
      quantity: -2.5,
      enabled: false,
      nullableBoolean: true,
      label: 'null',
      strings: ['TRUE', '2', 'false'],
    });
  });

  it('keeps the previous value for a scalar that expressions would not accept as an argument', async () => {
    const logWarn = vi.spyOn(window, 'logWarnOnce').mockImplementation(() => undefined);
    const { store } = await renderCalculations(
      {
        calculations: [
          { field: 'total', expression: '1,500' },
          // Surrounding whitespace is ignored, as expressions do
          { field: 'quantity', expression: ' 12 ' },
          { field: 'nullableNumber', expression: true },
          { field: 'enabled', expression: 2 },
          { field: 'nullableBoolean', expression: 'yes' },
          { field: 'summary.Rows', expression: 1.5 },
          { field: 'summary.Total', expression: '1,5' },
        ],
      },
      { total: 1, quantity: 1, nullableNumber: 1, enabled: true, nullableBoolean: false, summary: { Rows: 7 } },
    );
    expect(store.getState().data.models[defaultDataTypeMock].currentData).toEqual({
      total: 1,
      quantity: 12,
      nullableNumber: 1,
      enabled: true,
      nullableBoolean: false,
      summary: { Rows: 7 },
    });
    for (const field of ['total', 'nullableNumber', 'enabled', 'nullableBoolean', 'Rows', 'Total']) {
      expect(logWarn).toHaveBeenCalledWith(expect.stringContaining(`.${field}`));
    }
  });

  it('accepts a whole number for an integer target', async () => {
    const { store } = await renderCalculations(
      {
        calculations: [
          { field: 'summary.Rows', expression: 3 },
          { field: 'summary.Total', expression: ['dataModel', 'summary.Rows'] },
        ],
      },
      {},
    );
    expect(store.getState().data.models[defaultDataTypeMock].currentData).toEqual({ summary: { Rows: 3, Total: 3 } });
  });

  it('preserves explicit nulls without creating absent objects for null results', async () => {
    const { store } = await renderCalculations(
      {
        calculations: [
          { field: 'nullableNumber', expression: ['if', false, 1, 'else', null] },
          { field: 'missingObject.label', expression: ['if', false, 'x', 'else', null] },
        ],
      },
      { nullableNumber: null },
    );
    expect(store.getState().data.models[defaultDataTypeMock].currentData).toEqual({ nullableNumber: null });
  });

  it('keeps previous values on evaluation or type conversion errors and continues with other calculations', async () => {
    const logError = vi.spyOn(window, 'logError').mockImplementation(() => undefined);
    const logWarn = vi.spyOn(window, 'logWarnOnce').mockImplementation(() => undefined);
    const { store } = await renderCalculations(
      {
        calculations: [
          { field: 'total', expression: ['divide', 1, 0] },
          { field: 'enabled', expression: 'not a boolean' },
          { field: 'label', expression: 'still calculated' },
        ],
      },
      { total: 42, enabled: true },
    );
    expect(store.getState().data.models[defaultDataTypeMock].currentData).toEqual({
      total: 42,
      enabled: true,
      label: 'still calculated',
    });
    expect(logError).toHaveBeenCalled();
    expect(logWarn).toHaveBeenCalled();
  });

  it('converts list results and clears a number when a calculation returns null', async () => {
    const { store } = await renderCalculations(
      {
        calculations: [
          { field: 'numbers', expression: ['dataModel', 'strings'] },
          { field: 'total', expression: ['if', false, 1, 'else', null] },
          { field: 'label', expression: ['sum', ['dataModel', 'numbers']] },
        ],
      },
      { strings: ['2', '3'], total: 42 },
    );
    const model = store.getState().data.models[defaultDataTypeMock];
    expect(model.currentData).toEqual({ strings: ['2', '3'], numbers: [2, 3], total: null, label: '5' });
    const previous = model.currentData;
    act(() => store.getState().data.debounce('forced'));
    expect(store.getState().data.models[defaultDataTypeMock].currentData).toBe(previous);
  });

  it('runs once per data change rather than again immediately before saving', async () => {
    const { store } = await renderCalculations(
      {
        calculations: [{ field: 'total', expression: ['plus', ['dataModel', 'total'], 1] }],
      },
      { total: 2 },
    );
    expect(store.getState().data.models[defaultDataTypeMock].currentData).toEqual({ total: 3 });
    act(() => store.getState().data.debounce('beforeSave'));
    expect(store.getState().data.models[defaultDataTypeMock].currentData).toEqual({ total: 3 });
  });

  it('sets the properties an object result contains, keeps the others, and clears a property set to null', async () => {
    const { store } = await renderCalculations(
      {
        calculations: [
          {
            field: 'summary',
            expression: [
              'object',
              'Total',
              ['dataModel', 'quantity'],
              'Label',
              ['if', ['greaterThan', ['dataModel', 'quantity'], 0], 'some', 'else', null],
            ],
          },
        ],
      },
      { quantity: 1, summary: { Rows: 7, Label: 'old' } },
    );
    expect(store.getState().data.models[defaultDataTypeMock].currentData).toEqual({
      quantity: 1,
      summary: { Total: 1, Rows: 7, Label: 'some' },
    });
    act(() => {
      store
        .getState()
        .data.setLeafValue({ reference: { dataType: defaultDataTypeMock, field: 'quantity' }, newValue: 0 });
      store.getState().data.debounce('forced');
    });
    expect(store.getState().data.models[defaultDataTypeMock].currentData).toEqual({
      quantity: 0,
      summary: { Total: 0, Rows: 7, Label: null },
    });
  });

  it('merges a list of objects by position, keeping the ids and other properties of the rows it merges into', async () => {
    const { store } = await renderCalculations(
      {
        calculations: [
          {
            field: 'rows',
            expression: ['list', ['object', 'total', 1], ['object', 'total', 2]],
          },
        ],
      },
      {
        rows: [
          { altinnRowId: rowIdA, price: 10, total: 0 },
          { altinnRowId: rowIdB, price: 20, total: 0 },
          { altinnRowId: rowIdC, price: 30, total: 0 },
        ],
      },
    );
    expect(store.getState().data.models[defaultDataTypeMock].currentData).toEqual({
      rows: [
        { altinnRowId: rowIdA, price: 10, total: 1 },
        { altinnRowId: rowIdB, price: 20, total: 2 },
      ],
    });
  });

  it('appends rows with new ids, and copied rows keep the id of the row they are copied from', async () => {
    const { store } = await renderCalculations(
      { calculations: [{ field: 'copies', expression: ['dataModel', 'rows'] }] },
      {
        rows: [
          { altinnRowId: rowIdA, price: 10, quantity: 1 },
          { altinnRowId: rowIdB, price: 20, quantity: 2 },
        ],
        copies: [{ altinnRowId: rowIdCopyA, price: 0, quantity: 0 }],
      },
    );
    const model = store.getState().data.models[defaultDataTypeMock];
    expect(model.currentData).toEqual({
      rows: [
        { altinnRowId: rowIdA, price: 10, quantity: 1 },
        { altinnRowId: rowIdB, price: 20, quantity: 2 },
      ],
      copies: [
        { altinnRowId: rowIdA, price: 10, quantity: 1 },
        { altinnRowId: rowIdB, price: 20, quantity: 2 },
      ],
    });

    // Calculating again changes nothing, so the rows keep their ids and references
    const previous = model.currentData;
    act(() => store.getState().data.debounce('forced'));
    expect(store.getState().data.models[defaultDataTypeMock].currentData).toBe(previous);
  });

  it('clears a property in copied rows that the source rows leave out, as dataModel gives every property', async () => {
    const logWarn = vi.spyOn(window, 'logWarnOnce').mockImplementation(() => undefined);
    const { store } = await renderCalculations(
      { calculations: [{ field: 'copies', expression: ['dataModel', 'rows'] }] },
      {
        rows: [{ altinnRowId: rowIdA, price: 10 }],
        copies: [{ altinnRowId: rowIdA, price: 0, quantity: 5 }],
      },
    );
    expect(store.getState().data.models[defaultDataTypeMock].currentData).toEqual({
      rows: [{ altinnRowId: rowIdA, price: 10 }],
      copies: [{ altinnRowId: rowIdA, price: 10, quantity: null }],
    });
    // The source rows have children, which the copies do not
    expect(logWarn).toHaveBeenCalledWith(expect.stringContaining('copies[0].children'));
  });

  it('logs and leaves the list alone when a row in a list result is not an object', async () => {
    const logError = vi.spyOn(window, 'logErrorOnce').mockImplementation(() => undefined);
    const rows = [{ altinnRowId: rowIdA, price: 10 }];
    const { store } = await renderCalculations(
      { calculations: [{ field: 'rows', expression: ['list', ['object', 'price', 1], null] }] },
      { rows },
    );
    expect(store.getState().data.models[defaultDataTypeMock].currentData).toEqual({ rows });
    expect(logError).toHaveBeenCalledWith(expect.stringContaining('row 1 is not an object'));
  });

  it('logs and leaves the list alone when two rows in a list result have the same id', async () => {
    const logError = vi.spyOn(window, 'logErrorOnce').mockImplementation(() => undefined);
    const rows = [{ altinnRowId: rowIdA, price: 10 }];
    const { store } = await renderCalculations(
      {
        calculations: [
          {
            field: 'rows',
            expression: [
              'list',
              ['object', 'altinnRowId', rowIdA, 'price', 1],
              ['object', 'altinnRowId', rowIdA, 'price', 2],
            ],
          },
        ],
      },
      { rows },
    );
    expect(store.getState().data.models[defaultDataTypeMock].currentData).toEqual({ rows });
    expect(logError).toHaveBeenCalledWith(expect.stringContaining(`altinnRowId ${rowIdA}`));
  });

  it('leaves a list of primitives alone when the result is a list of objects', async () => {
    const logWarn = vi.spyOn(window, 'logWarnOnce').mockImplementation(() => undefined);
    const { store } = await renderCalculations(
      { calculations: [{ field: 'numbers', expression: ['list', ['object', 'v', 1]] }] },
      { numbers: [2, 3] },
    );
    expect(store.getState().data.models[defaultDataTypeMock].currentData).toEqual({ numbers: [2, 3] });
    expect(logWarn).toHaveBeenCalledWith(expect.stringContaining('numbers'));
  });

  it('removes all rows when a list result is empty', async () => {
    const { store } = await renderCalculations(
      { calculations: [{ field: 'rows', expression: ['list'] }] },
      { rows: [{ altinnRowId: rowIdA, price: 10 }] },
    );
    expect(store.getState().data.models[defaultDataTypeMock].currentData).toEqual({ rows: [] });
  });

  it('skips a key the data model does not have and sets the others', async () => {
    const logWarn = vi.spyOn(window, 'logWarnOnce').mockImplementation(() => undefined);
    const { store } = await renderCalculations(
      { calculations: [{ field: 'summary', expression: ['object', 'Total', '12', 'Unknown', 1] }] },
      { quantity: 1 },
    );
    expect(store.getState().data.models[defaultDataTypeMock].currentData).toEqual({
      quantity: 1,
      summary: { Total: 12 },
    });
    expect(logWarn).toHaveBeenCalledWith(expect.stringContaining('summary.Unknown'));
  });

  it('has nothing more to save when the backend fills in defaults and row ids the frontend did not set', async () => {
    const { store } = await renderCalculations(
      {
        calculations: [
          { field: 'summary', expression: ['object', 'Total', ['dataModel', 'quantity']] },
          { field: 'rows', expression: ['list', ['object', 'total', ['dataModel', 'quantity']]] },
        ],
      },
      { quantity: 1 },
    );
    const before = store.getState().data.models[defaultDataTypeMock];
    expect(before.currentData).toEqual({
      quantity: 1,
      summary: { Total: 1 },
      rows: [{ altinnRowId: isUuid, total: 1 }],
    });

    // The backend serializes the non-nullable Rows property, and gives the row the id it stores
    const fromBackend = {
      quantity: 1,
      summary: { Total: 1, Rows: 0 },
      rows: [{ altinnRowId: 'from-backend', total: 1 }],
    };
    act(() => {
      store.getState().data.saveFinished({
        savedData: { [defaultDataTypeMock]: before.currentData },
        newDataModels: [
          { data: fromBackend, dataType: defaultDataTypeMock, dataElementId: before.dataElementId ?? undefined },
        ],
        validationIssues: undefined,
      });
    });
    const after = store.getState().data.models[defaultDataTypeMock];
    expect(after.currentData).toEqual(fromBackend);
    expect(after.currentData).toBe(after.lastSavedData);
    act(() => store.getState().data.debounce('forced'));
    expect(store.getState().data.models[defaultDataTypeMock].currentData).toBe(after.lastSavedData);
  });

  it('skips malformed definitions without losing valid calculations', () => {
    const logWarn = vi.spyOn(window, 'logWarn').mockImplementation(() => undefined);
    expect(
      resolveCalculationConfig({
        calculations: [
          { field: 'total' },
          { expression: true },
          null,
          { field: 'label', expression: null },
          { field: 'enabled', expression: false },
        ],
      }),
    ).toEqual({
      calculations: [{ field: 'enabled', expression: false }],
    });
    expect(logWarn).toHaveBeenCalledWith('Skipping invalid calculation for label');
    expect(resolveCalculationConfig(null)).toBeNull();
  });

  it('ignores the old format where calculations were keyed by field', () => {
    expect(resolveCalculationConfig({ calculations: { total: { expression: false } } })).toBeNull();
  });
});
