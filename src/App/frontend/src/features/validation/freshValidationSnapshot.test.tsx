import { renderHook } from '@testing-library/react';

import { defaultDataTypeMock } from 'src/__mocks__/getUiConfigMock';
import { processLayouts } from 'src/features/form/layout/LayoutsContext';
import { makeLayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import { ValidationMask } from 'src/features/validation';
import { getValidationsForNode } from 'src/features/validation/deriveValidationState';
import { useGetDerivedValidationState } from 'src/features/validation/validationHooks';
import type { ExpressionDataSources } from 'src/features/expressions/runtime/useExpressionDataSources';
import type { FormStoreState } from 'src/features/form/FormContext';
import type { ILayoutCollection } from 'src/layout/layout';

const mutable = { required: 'yes', state: undefined as FormStoreState | undefined };
const store = { getState: () => mutable.state! };
const runtime = {
  markExpressionEvaluated: vi.fn(),
  track: vi.fn(),
  getDependencies: () => [],
  getSnapshotRevision: () => 0,
  collectDependencies: <T,>(evaluate: () => T) => ({ value: evaluate(), dependencies: [] }),
  context: { assertDataSourceSupported: vi.fn() },
  externalApi: { getAll: () => ({ data: { requirements: { required: mutable.required } }, errors: {} }) },
} as unknown as ExpressionDataSources;

vi.mock('src/features/form/FormContext', () => ({ FormStore: { raw: { useStore: () => store } } }));
vi.mock('src/core/queries/instance', () => ({ useGetCachedInstanceData: () => () => undefined }));
vi.mock('src/core/contexts/TaskOverrides', () => ({ useTaskOverrides: () => undefined }));
vi.mock('src/hooks/navigation', () => ({ useAllNavigationParams: () => ({ taskId: 'Task_1' }) }));
vi.mock('src/features/form/layoutSettings/processLayoutSettings', () => ({
  processLayoutSettings: () => ({ order: ['Form'], pdfLayoutName: undefined }),
  useRawPageOrder: vi.fn(),
  usePdfLayoutName: vi.fn(),
}));
vi.mock('src/features/expressions/runtime/useExpressionDataSources', () => ({
  useExpressionDataSourcesBaseForStoreSelector: () => runtime,
}));

it('reads current query-backed validations in an event callback before an observer revision or render occurs', () => {
  const layouts: ILayoutCollection = {
    Form: {
      data: {
        layout: [
          {
            id: 'input',
            type: 'Input',
            required: ['equals', ['externalApi', 'requirements', 'required'], 'yes'],
            dataModelBindings: { simpleBinding: { dataType: defaultDataTypeMock, field: 'TextField' } },
          },
        ],
      },
    },
  };
  mutable.state = {
    bootstrap: {
      uiFolder: 'Task_1',
      dataModels: {},
      layoutLookups: makeLayoutLookups(processLayouts(layouts, defaultDataTypeMock), layouts),
    },
    data: {
      models: {
        [defaultDataTypeMock]: {
          currentData: { TextField: '' },
          debouncedCurrentData: { TextField: '' },
          invalidCurrentData: {},
          validations: { backend: {}, schema: {}, invalidData: {} },
        },
      },
    },
    validation: { formMask: ValidationMask.Required, pageMasks: {}, rowMasks: {} },
  } as unknown as FormStoreState;
  mutable.required = 'yes';
  const { result } = renderHook(useGetDerivedValidationState);
  const callback = result.current;
  expect(getValidationsForNode(callback(), 'input', 'visible')).toHaveLength(1);

  // No FormStore change, runtime identity/revision change, or React render.
  mutable.required = 'no';
  expect(getValidationsForNode(callback(), 'input', 'visible')).toEqual([]);
});
