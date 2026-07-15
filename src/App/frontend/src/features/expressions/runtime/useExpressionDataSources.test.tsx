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
  countDataElements: jest.fn(() => 0),
  getCachedInstance: jest.fn(() => undefined),
};
const mockQueryCacheObserver = { subscribe: jest.fn(() => jest.fn()) };
const mockExternalApiQueries = {
  ensureLoaded: jest.fn(),
  getCached: jest.fn(() => ({})),
  getState: jest.fn(() => undefined),
};
const mockTextResourceQueries = {
  ensureLoaded: jest.fn(),
  getCached: jest.fn(() => undefined),
};

jest.mock('src/features/applicationSettings/ApplicationSettingsProvider', () => ({
  useApplicationSettings: () => mockInputs.applicationSettings,
}));
jest.mock('src/features/language/LanguageProvider', () => ({
  useCurrentLanguage: () => mockInputs.currentLanguage,
}));
jest.mock('src/hooks/navigation', () => ({
  useAllNavigationParams: () => ({ pageKey: mockInputs.currentPage }),
}));
jest.mock('src/utils/layout/DataModelLocation', () => ({
  useCurrentDataModelLocation: () => undefined,
}));
jest.mock('src/features/form/FormContext', () => ({
  FormStore: { raw: { useLaxStore: () => ContextNotProvided } },
}));
jest.mock('src/core/contexts/ApiProvider', () => ({
  useTextResourcesApi: () => jest.fn(),
}));
jest.mock('src/features/formData/FormDataReaders', () => ({
  useDataModelReaders: () => ({}),
}));
jest.mock('src/core/queries/instance', () => ({
  useCachedInstanceQueries: () => mockInstanceQueries,
}));
jest.mock('src/core/queries/queryCache', () => ({
  useQueryCacheObserver: () => mockQueryCacheObserver,
}));
jest.mock('src/core/queries/externalApi', () => ({
  useExternalApiQueries: () => mockExternalApiQueries,
}));
jest.mock('src/core/queries/textResources', () => ({
  useTextResourcesQueries: () => mockTextResourceQueries,
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
  const onAfterFunctionCall = jest.fn();
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
