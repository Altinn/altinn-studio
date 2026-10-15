import { useSyncExternalStore } from 'react';

import { act, renderHook } from '@testing-library/react';
import { createStore } from 'zustand';

import { processLayouts } from 'src/features/form/layout/LayoutsContext';
import { makeLayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import { useIsValidPageId } from 'src/hooks/useNavigatePage';
import { useHiddenPages, useIsHiddenPage } from 'src/utils/layout/hidden';
import type { FormStoreApi } from 'src/features/form/FormContext';
import type { ILayoutCollection } from 'src/layout/layout';

let layouts: ILayoutCollection;
let displayValues: Record<string, string>;
let store: FormStoreApi;
const displayListeners = new Set<() => void>();
const pageOrder = ['First', 'Second', 'Controls'];
const queryCacheObserver = { subscribe: vi.fn(() => vi.fn()) };
const useDisplayDataFor = vi.fn((componentIds: string[]) => {
  const values = useSyncExternalStore(
    (listener) => {
      displayListeners.add(listener);
      return () => displayListeners.delete(listener);
    },
    () => displayValues,
  );
  return Object.fromEntries(componentIds.map((id) => [id, values[id]]));
});

vi.mock('src/features/displayData/useDisplayData', () => ({
  useDisplayDataFor: (componentIds: string[]) => useDisplayDataFor(componentIds),
}));
vi.mock('src/features/form/FormContext', () => ({
  FormStore: {
    raw: { useLaxStore: () => store },
    bootstrap: {
      useLayoutCollection: () => layouts,
      useLaxLayoutCollection: () => layouts,
    },
  },
}));
vi.mock('src/features/form/layoutSettings/processLayoutSettings', () => ({
  useRawPageOrder: () => pageOrder,
}));
vi.mock('src/features/devtools/data/DevToolsStore', () => ({
  useDevToolsStore: () => false,
}));
vi.mock('src/features/applicationSettings/ApplicationSettingsProvider', () => ({
  useApplicationSettings: () => null,
}));
vi.mock('src/features/language/LanguageProvider', () => ({
  useCurrentLanguage: () => 'nb',
}));
vi.mock('src/hooks/navigation', () => ({
  useAllNavigationParams: () => ({ pageKey: 'First' }),
  useAllNavigationParamsAsRef: () => ({ current: { taskId: 'Task_1', pageKey: 'First' } }),
}));
vi.mock('src/features/instance/useProcessQuery', () => ({
  useGetTaskTypeById: () => () => 'data',
}));
vi.mock('src/utils/layout/DataModelLocation', () => ({
  useCurrentDataModelLocation: () => undefined,
}));
vi.mock('src/core/contexts/ApiProvider', () => ({
  useTextResourcesApi: () => vi.fn(),
}));
vi.mock('src/features/formData/FormDataReaders', () => ({
  useDataModelReaders: () => ({}),
}));
vi.mock('src/core/queries/expressionQueryReaders', () => ({
  useExpressionQueryReaders: () => ({
    instanceQueries: {
      countDataElements: () => 0,
      getCachedInstance: () => undefined,
    },
    queryCacheObserver,
    externalApiQueries: {
      ensureLoaded: vi.fn(),
      getCached: () => ({}),
      getState: () => undefined,
    },
    textResourceQueries: {
      ensureLoaded: vi.fn(),
      getCached: () => undefined,
    },
  }),
}));

beforeEach(() => {
  useDisplayDataFor.mockClear();
  displayValues = { 'page-control': 'show', 'other-page-control': 'show' };
  layouts = {
    First: {
      data: {
        layout: [
          {
            id: 'input',
            type: 'Input',
            dataModelBindings: { simpleBinding: { dataType: 'model', field: 'Value' } },
            hidden: ['equals', ['displayValue', 'child-control'], 'hide'],
            textResourceBindings: { title: ['displayValue', 'title-control'] },
          },
        ],
      },
    },
    Second: { data: { layout: [] } },
    Controls: {
      data: {
        layout: [
          {
            id: 'page-control',
            type: 'Input',
            dataModelBindings: { simpleBinding: { dataType: 'model', field: 'Control' } },
          },
          {
            id: 'other-page-control',
            type: 'Input',
            dataModelBindings: { simpleBinding: { dataType: 'model', field: 'OtherControl' } },
          },
        ],
      },
    },
  };
  store = createStore(() => ({
    bootstrap: {
      layoutLookups: makeLayoutLookups(processLayouts(layouts, 'model'), layouts),
    },
  })) as unknown as FormStoreApi;
});

function changeDisplayValue(id: string, value: string) {
  act(() => {
    displayValues = { ...displayValues, [id]: value };
    displayListeners.forEach((listener) => listener());
  });
}

describe('page visibility display values', () => {
  it.each(['single page', 'all pages'] as const)(
    'does not subscribe to component titles or hidden expressions when checking %s',
    (scope) => {
      const { result } = renderHook(() => (scope === 'single page' ? useIsHiddenPage('First') : useHiddenPages()));

      expect(result.current).toEqual(scope === 'single page' ? false : new Set());
      expect(useDisplayDataFor).not.toHaveBeenCalled();
      expect(displayListeners.size).toBe(0);
    },
  );

  it('subscribes only to the requested page hidden expression and updates when its display value changes', () => {
    layouts.First.data.hidden = ['equals', ['displayValue', 'page-control'], 'hide'];
    layouts.Second.data.hidden = ['equals', ['displayValue', 'other-page-control'], 'hide'];
    const { result } = renderHook(() => useIsHiddenPage('First'));

    expect(result.current).toBe(false);
    expect(useDisplayDataFor).toHaveBeenLastCalledWith(['page-control']);
    expect(displayListeners.size).toBe(1);

    changeDisplayValue('page-control', 'hide');
    expect(result.current).toBe(true);
    changeDisplayValue('page-control', 'show');
    expect(result.current).toBe(false);
  });

  it('tracks genuine hidden expressions across pages and updates the set of hidden pages', () => {
    layouts.First.data.hidden = ['equals', ['displayValue', 'page-control'], 'hide'];
    layouts.Second.data.hidden = ['equals', ['displayValue', 'other-page-control'], 'hide'];
    const { result } = renderHook(() => useHiddenPages());

    expect(result.current).toEqual(new Set());
    expect(useDisplayDataFor).toHaveBeenLastCalledWith(['page-control', 'other-page-control']);
    expect(displayListeners.size).toBe(1);

    changeDisplayValue('page-control', 'hide');
    expect(result.current).toEqual(new Set(['First']));
    changeDisplayValue('other-page-control', 'hide');
    expect(result.current).toEqual(new Set(['First', 'Second']));
    changeDisplayValue('page-control', 'show');
    expect(result.current).toEqual(new Set(['Second']));
  });
});

describe('page visibility during navigation', () => {
  it('does not subscribe to display values used only by component expressions', () => {
    const { result } = renderHook(() => useIsValidPageId());

    expect(result.current('First')).toBe(true);
    expect(result.current('Second')).toBe(true);
    expect(result.current('Unknown')).toBe(false);
    expect(useDisplayDataFor).not.toHaveBeenCalled();
    expect(displayListeners.size).toBe(0);
  });

  it('updates valid navigation targets when genuine page hidden display values change', () => {
    layouts.First.data.hidden = ['equals', ['displayValue', 'page-control'], 'hide'];
    const { result } = renderHook(() => useIsValidPageId());

    expect(result.current('First')).toBe(true);
    expect(useDisplayDataFor).toHaveBeenLastCalledWith(['page-control']);
    expect(displayListeners.size).toBe(1);

    changeDisplayValue('page-control', 'hide');
    expect(result.current('First')).toBe(false);
    expect(result.current('Second')).toBe(true);
    changeDisplayValue('page-control', 'show');
    expect(result.current('First')).toBe(true);
  });
});
