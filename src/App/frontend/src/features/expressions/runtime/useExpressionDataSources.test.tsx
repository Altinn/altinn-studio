import { act, renderHook, waitFor } from '@testing-library/react';

import { ContextNotProvided } from 'src/core/contexts/context';
import { ExprVal } from 'src/features/expressions/types';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import type { IApplicationSettings } from 'src/types/shared';

const mockInputs: {
  currentLanguage: string;
  currentPage: string;
  applicationSettings: IApplicationSettings | null;
} = {
  currentLanguage: 'nb',
  currentPage: 'page-1',
  applicationSettings: null,
};
const mockInstanceQueries = {
  countDataElements: vi.fn(() => 0),
  getCachedInstance: vi.fn(() => undefined),
};
const mockQueryCacheObserver = { subscribe: vi.fn(() => vi.fn()) };
const mockExternalApiQueries = {
  ensureLoaded: vi.fn(),
  getCached: vi.fn(() => ({})),
  getState: vi.fn(() => undefined),
};
const mockTextResourceQueries = {
  ensureLoaded: vi.fn(),
  getCached: vi.fn(() => undefined),
};

vi.mock('src/features/applicationSettings/ApplicationSettingsProvider', () => ({
  useApplicationSettings: () => mockInputs.applicationSettings,
}));
vi.mock('src/features/language/LanguageProvider', () => ({
  useCurrentLanguage: () => mockInputs.currentLanguage,
}));
vi.mock('src/hooks/navigation', () => ({
  useAllNavigationParams: () => ({ pageKey: mockInputs.currentPage }),
}));
vi.mock('src/utils/layout/DataModelLocation', () => ({
  useCurrentDataModelLocation: () => undefined,
}));
vi.mock('src/features/form/FormContext', () => ({
  FormStore: { raw: { useLaxStore: () => ContextNotProvided } },
}));
vi.mock('src/core/contexts/ApiProvider', () => ({
  useTextResourcesApi: () => vi.fn(),
}));
vi.mock('src/features/formData/FormDataReaders', () => ({
  useDataModelReaders: () => ({}),
}));
vi.mock('src/core/queries/expressionQueryReaders', () => ({
  useExpressionQueryReaders: () => ({
    instanceQueries: mockInstanceQueries,
    queryCacheObserver: mockQueryCacheObserver,
    externalApiQueries: mockExternalApiQueries,
    textResourceQueries: mockTextResourceQueries,
  }),
}));

beforeEach(() => {
  mockInputs.currentLanguage = 'nb';
  mockInputs.currentPage = 'page-1';
  mockInputs.applicationSettings = null;
});

it('updates a language expression when the current language changes', async () => {
  const expression: ['language'] = ['language'];
  const { result, rerender } = renderHook(() =>
    useEvalExpression(expression, { returnType: ExprVal.String, defaultValue: '' }),
  );
  expect(result.current).toBe('nb');

  mockInputs.currentLanguage = 'en';
  rerender();

  await waitFor(() => expect(result.current).toBe('en'));
});

it('updates an expression that uses the current page when the page changes', async () => {
  const expression: ['linkToPage', string, string, boolean] = ['linkToPage', 'Next', 'target', true];
  const { result, rerender } = renderHook(() =>
    useEvalExpression(expression, { returnType: ExprVal.String, defaultValue: '' }),
  );
  expect(result.current).toContain('backToPage=page-1');

  mockInputs.currentPage = 'page-2';
  rerender();

  await waitFor(() => expect(result.current).toContain('backToPage=page-2'));
});

it('updates an expression that uses application settings when the settings change', async () => {
  mockInputs.applicationSettings = { setting: 'first' };
  const expression: ['frontendSettings', string] = ['frontendSettings', 'setting'];
  const { result, rerender } = renderHook(() =>
    useEvalExpression(expression, { returnType: ExprVal.String, defaultValue: '' }),
  );
  expect(result.current).toBe('first');

  mockInputs.applicationSettings = { setting: 'second' };
  rerender();

  await waitFor(() => expect(result.current).toBe('second'));
});

it('does not reevaluate an expression that does not use changed hook inputs', async () => {
  const expression: ['equals', number, number] = ['equals', 1, 1];
  const onAfterFunctionCall = vi.fn();
  const { rerender } = renderHook(() =>
    useEvalExpression(expression, {
      returnType: ExprVal.Boolean,
      defaultValue: false,
      onAfterFunctionCall,
    }),
  );
  expect(onAfterFunctionCall).toHaveBeenCalledTimes(1);

  mockInputs.currentLanguage = 'en';
  mockInputs.currentPage = 'page-2';
  mockInputs.applicationSettings = { setting: 'second' };
  await act(async () => {
    rerender();
    await Promise.resolve();
  });

  expect(onAfterFunctionCall).toHaveBeenCalledTimes(1);
});
