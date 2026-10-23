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
    missingObject: { type: 'object', properties: { label: { type: 'string' } } },
  },
};

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
  it('preserves stored values when a PDF previews another task with calculations', async () => {
    const initialData = { quantity: 4, total: 3 };
    const { store } = await renderCalculations(
      { calculations: { total: { expression: ['multiply', ['dataModel', 'quantity'], 2] } } },
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
        calculations: {
          total: { expression: ['multiply', ['dataModel', 'quantity'], 2] },
          label: { expression: ['dataModel', 'total'] },
          enabled: { expression: ['greaterThan', ['dataModel', 'total'], 0] },
        },
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
        calculations: {
          total: { expression: ['multiply', ['dataModel', 'quantity', 'other'], 2] },
        },
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
        calculations: {
          'rows.total': { expression: ['multiply', ['dataModel', 'rows.price'], ['dataModel', 'rows.quantity']] },
          'rows.children.label': { expression: ['argv', 0] },
          total: { expression: ['sum', ['jmespath', ['dataModel', 'rows'], '[].total']] },
        },
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
      { calculations: { total: { expression: ['sum', ['dataModel', 'numbers']] } } },
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
        calculations: {
          label: { expression: ['if', ['dataModel', 'enabled'], 'yes', 'else', null] },
        },
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
      { calculations: { total: { expression: ['dataModel', 'quantity'] } } },
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
        calculations: {
          nullableNumber: { expression: ['if', ['dataModel', 'enabled'], 3, 'else', null] },
          nullableBoolean: { expression: ['if', ['dataModel', 'enabled'], true, 'else', null] },
        },
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

  it('preserves explicit nulls without creating absent objects for empty calculations', async () => {
    const { store } = await renderCalculations(
      {
        calculations: {
          nullableNumber: { expression: null },
          'missingObject.label': { expression: null },
        },
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
        calculations: {
          total: { expression: ['divide', 1, 0] },
          enabled: { expression: 'not a boolean' },
          label: { expression: 'still calculated' },
        },
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

  it('converts list results and preserves existing non-nullable numbers when a calculation returns null', async () => {
    vi.spyOn(window, 'logWarnOnce').mockImplementation(() => undefined);
    const { store } = await renderCalculations(
      {
        calculations: {
          numbers: { expression: ['dataModel', 'strings'] },
          total: { expression: null },
          label: { expression: ['sum', ['dataModel', 'numbers']] },
        },
      },
      { strings: ['2', '3'], total: 42 },
    );
    const model = store.getState().data.models[defaultDataTypeMock];
    expect(model.currentData).toEqual({ strings: ['2', '3'], numbers: [2, 3], total: 42, label: '5' });
    const previous = model.currentData;
    act(() => store.getState().data.debounce('forced'));
    expect(store.getState().data.models[defaultDataTypeMock].currentData).toBe(previous);
  });

  it('runs once per data change rather than again immediately before saving', async () => {
    const { store } = await renderCalculations(
      {
        calculations: {
          total: { expression: ['plus', ['dataModel', 'total'], 1] },
        },
      },
      { total: 2 },
    );
    expect(store.getState().data.models[defaultDataTypeMock].currentData).toEqual({ total: 3 });
    act(() => store.getState().data.debounce('beforeSave'));
    expect(store.getState().data.models[defaultDataTypeMock].currentData).toEqual({ total: 3 });
  });

  it('skips malformed definitions without losing valid calculations', () => {
    vi.spyOn(window, 'logWarn').mockImplementation(() => undefined);
    expect(resolveCalculationConfig({ calculations: { total: {}, enabled: { expression: false } } })).toEqual({
      calculations: { enabled: { expression: false } },
    });
    expect(resolveCalculationConfig(null)).toBeNull();
  });
});
