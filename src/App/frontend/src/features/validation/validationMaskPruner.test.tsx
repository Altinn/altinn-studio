import React from 'react';
import { MemoryRouter } from 'react-router';
import type { PropsWithChildren } from 'react';

import { act, renderHook } from '@testing-library/react';
import { createStore } from 'zustand';

import { FormStoreProvider } from 'src/features/form/FormContext';
import { processLayouts } from 'src/features/form/layout/LayoutsContext';
import { makeLayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import { CurrentLanguageProvider } from 'src/features/language/LanguageProvider';
import { ValidationMask } from 'src/features/validation';
import * as derivedValidation from 'src/features/validation/deriveValidationState';
import { usePruneValidationMasks } from 'src/features/validation/validationHooks';
import type { FormStoreApi, FormStoreState } from 'src/features/form/FormContext';
import type { ILayoutCollection } from 'src/layout/layout';

const pageOrder = ['First'];
const instanceData: never[] = [];
const expressionDataSources = {};
let store: FormStoreApi;

vi.mock('src/features/form/layoutSettings/processLayoutSettings', () => ({
  useRawPageOrder: () => pageOrder,
  usePdfLayoutName: () => undefined,
}));
vi.mock('src/features/expressions/runtime/useExpressionDataSources', () => ({
  useExpressionDataSourcesBaseForStoreSelector: () => expressionDataSources,
}));
vi.mock('src/features/instance/InstanceContext', () => ({
  useInstanceDataQuery: () => ({ data: instanceData }),
}));
vi.mock('src/features/instance/useProcessTaskId', () => ({
  useProcessTaskId: () => 'Task_1',
}));

function Wrapper({ children }: PropsWithChildren) {
  return (
    <MemoryRouter>
      <CurrentLanguageProvider>
        <FormStoreProvider value={store}>{children}</FormStoreProvider>
      </CurrentLanguageProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  const layouts = {
    First: {
      data: {
        layout: [
          {
            id: 'input',
            type: 'Input',
            required: true,
            dataModelBindings: { simpleBinding: { dataType: 'model', field: 'Value' } },
            textResourceBindings: { title: 'Input title' },
          },
        ],
      },
    },
  } satisfies ILayoutCollection;
  store = createStore<FormStoreState>(
    () =>
      ({
        bootstrap: {
          layoutLookups: makeLayoutLookups(processLayouts(layouts, 'model'), layouts),
          dataModels: { model: {} },
        },
        data: {
          models: {
            model: {
              debouncedCurrentData: {},
              currentData: {},
              invalidCurrentData: {},
              validations: { backend: {}, invalidData: {}, schema: {} },
            },
          },
        },
        validation: {
          formMask: 0,
          pageMasks: {},
          rowMasks: {},
          setFormMask: (mask: number | undefined) =>
            store.setState((state) => ({
              validation: { ...state.validation, formMask: mask ?? 0 },
            })),
          setPageMask: (page: string, mask: number | undefined) =>
            store.setState((state) => {
              const pageMasks = { ...state.validation.pageMasks };
              if (mask === undefined) {
                delete pageMasks[page];
              } else {
                pageMasks[page] = mask;
              }
              return { validation: { ...state.validation, pageMasks } };
            }),
          setRowMask: (row: string, mask: number | undefined) =>
            store.setState((state) => {
              const rowMasks = { ...state.validation.rowMasks };
              if (mask === undefined) {
                delete rowMasks[row];
              } else {
                rowMasks[row] = mask;
              }
              return { validation: { ...state.validation, rowMasks } };
            }),
        },
      }) as unknown as FormStoreState,
  );
});

function fillField(debounced: boolean) {
  act(() =>
    store.setState((state) => ({
      data: {
        ...state.data,
        models: {
          ...state.data.models,
          model: {
            ...state.data.models.model,
            ...(debounced ? { debouncedCurrentData: { Value: 'filled' } } : { currentData: { Value: 'filled' } }),
          },
        },
      },
    })),
  );
}

it('does not derive or subscribe to complete form changes when no validation masks need pruning', () => {
  const build = vi.spyOn(derivedValidation, 'buildDerivedValidationState');
  const renders = vi.fn();
  const { result } = renderHook(
    () => {
      renders();
      return usePruneValidationMasks();
    },
    { wrapper: Wrapper },
  );

  expect(build).not.toHaveBeenCalled();
  fillField(false);
  fillField(true);
  expect(renders).toHaveBeenCalledTimes(1);
  expect(build).not.toHaveBeenCalled();
  act(() => result.current());
  expect(build).not.toHaveBeenCalled();
  build.mockRestore();
});

it.each(['form', 'page'] as const)(
  'keeps an unresolved %s mask and clears it after the required field is filled',
  (scope) => {
    const { result } = renderHook(() => usePruneValidationMasks(), { wrapper: Wrapper });
    act(() => {
      const validation = store.getState().validation;
      if (scope === 'form') {
        validation.setFormMask(ValidationMask.Required);
      } else {
        validation.setPageMask('First', ValidationMask.Required);
      }
    });
    act(() => result.current());
    expect(scope === 'form' ? store.getState().validation.formMask : store.getState().validation.pageMasks.First).toBe(
      ValidationMask.Required,
    );

    fillField(true);
    act(() => result.current());
    expect(scope === 'form' ? store.getState().validation.formMask : store.getState().validation.pageMasks.First).toBe(
      scope === 'form' ? 0 : undefined,
    );
  },
);

it('activates pruning for stale row masks and removes them', () => {
  const { result } = renderHook(() => usePruneValidationMasks(), { wrapper: Wrapper });
  act(() => store.getState().validation.setRowMask('removed-row', ValidationMask.Required));
  act(() => result.current());
  expect(store.getState().validation.rowMasks).toEqual({});
});
