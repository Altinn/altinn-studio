import { CommonExpressions, Expressions } from '@app/layout-contract/generated/expressions.generated';
import { act, renderHook, waitFor } from '@testing-library/react';

import { ContextNotProvided } from 'src/core/contexts/context';
import {
  useEvalExpression,
  useEvalExpressionCallback,
  useEvalOptionalText,
  useEvalOptionalTrb,
} from 'src/utils/layout/useEvalExpression';
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
  const { result, rerender } = renderHook(() => useEvalExpression(expression, CommonExpressions.TRBLabel.title));
  expect(result.current).toBe('nb');

  mockInputs.currentLanguage = 'en';
  rerender();

  await waitFor(() => expect(result.current).toBe('en'));
});

it('updates an expression that uses the current page when the page changes', async () => {
  const expression: ['linkToPage', string, string, boolean] = ['linkToPage', 'Next', 'target', true];
  const { result, rerender } = renderHook(() => useEvalExpression(expression, CommonExpressions.TRBLabel.title));
  expect(result.current).toContain('backToPage=page-1');

  mockInputs.currentPage = 'page-2';
  rerender();

  await waitFor(() => expect(result.current).toContain('backToPage=page-2'));
});

it('updates an expression that uses application settings when the settings change', async () => {
  mockInputs.applicationSettings = { setting: 'first' };
  const expression: ['frontendSettings', string] = ['frontendSettings', 'setting'];
  const { result, rerender } = renderHook(() => useEvalExpression(expression, CommonExpressions.TRBLabel.title));
  expect(result.current).toBe('first');

  mockInputs.applicationSettings = { setting: 'second' };
  rerender();

  await waitFor(() => expect(result.current).toBe('second'));
});

it('does not reevaluate an expression that does not use changed hook inputs', async () => {
  const expression: ['equals', number, number] = ['equals', 1, 1];
  const onAfterFunctionCall = vi.fn();
  const { rerender } = renderHook(() =>
    useEvalExpression(expression, Expressions.Input.required, { onAfterFunctionCall }),
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

it('uses generated fallbacks and preserves explicit false', () => {
  const { result } = renderHook(() => ({
    required: useEvalExpression(undefined, Expressions.Input.required),
    addButton: useEvalExpression(undefined, Expressions.RepeatingGroup.edit.addButton),
    saveButton: useEvalExpression(false, Expressions.RepeatingGroup.edit.saveButton),
  }));
  expect(result.current).toEqual({ required: false, addButton: true, saveButton: false });
});

it('updates a generated descriptor expression when its dependency changes', async () => {
  const expression: ['equals', ['language'], string] = ['equals', ['language'], 'nb'];
  const { result, rerender } = renderHook(() => useEvalExpression(expression, Expressions.Input.required));
  expect(result.current).toBe(true);
  mockInputs.currentLanguage = 'en';
  rerender();
  await waitFor(() => expect(result.current).toBe(false));
});

it('uses the generated fallback when evaluation fails', () => {
  const logError = vi.spyOn(window, 'logError').mockImplementation(() => undefined);
  const expression: ['dataModel', string] = ['dataModel', 'unknownField'];
  const { result } = renderHook(() => useEvalExpression(expression, Expressions.RepeatingGroup.edit.saveButton));
  expect(result.current).toBe(true);
  expect(logError).toHaveBeenCalled();
});

it('preserves absent optional text without changing generic descriptor defaults', () => {
  const descriptor = { ...CommonExpressions.TRBLabel.title, defaultValue: 'fallback-title' };
  const { result } = renderHook(() => ({
    optional: useEvalOptionalText(undefined, descriptor),
    generic: useEvalExpression(undefined, descriptor),
    empty: useEvalOptionalText('', descriptor),
  }));
  expect(result.current).toEqual({ optional: undefined, generic: 'fallback-title', empty: '' });
});

it('evaluates a binding only when the component has that text resource key', () => {
  const { result, rerender } = renderHook(
    ({ textResourceBindings }: { textResourceBindings: object }) =>
      useEvalOptionalTrb({ textResourceBindings }, 'title', CommonExpressions.TRBLabel),
    { initialProps: { textResourceBindings: { title: 'title' } } },
  );
  expect(result.current).toBe('title');
  rerender({ textResourceBindings: { help: 'help' } });
  expect(result.current).toBeUndefined();
});

it('uses the descriptor fallback when a configured optional text expression fails', () => {
  vi.spyOn(window, 'logError').mockImplementation(() => undefined);
  const descriptor = { ...CommonExpressions.TRBLabel.title, defaultValue: 'fallback-title' };
  const expression: ['dataModel', string] = ['dataModel', 'unknownField'];
  const { result } = renderHook(() => useEvalOptionalText(expression, descriptor));
  expect(result.current).toBe('fallback-title');
});

it('subscribes to optional text dependencies as bindings are added and removed', async () => {
  const expression: ['language'] = ['language'];
  const { result, rerender } = renderHook(
    ({ configured }) => useEvalOptionalText(configured ? expression : undefined, CommonExpressions.TRBLabel.title),
    { initialProps: { configured: false } },
  );
  expect(result.current).toBeUndefined();
  rerender({ configured: true });
  await waitFor(() => expect(result.current).toBe('nb'));
  mockInputs.currentLanguage = 'en';
  rerender({ configured: true });
  await waitFor(() => expect(result.current).toBe('en'));
  rerender({ configured: false });
  await waitFor(() => expect(result.current).toBeUndefined());
});

it('reads fresh inputs when a callback is invoked after a rerender', () => {
  const expression: ['language'] = ['language'];
  const { result, rerender } = renderHook(() =>
    useEvalExpressionCallback(expression, CommonExpressions.TRBLabel.title),
  );
  const evaluate = result.current;
  mockInputs.currentLanguage = 'en';
  rerender();
  expect(evaluate()).toBe('en');
});

it('uses descriptor fallbacks for callback evaluation failures', () => {
  const logError = vi.spyOn(window, 'logError').mockImplementation(() => undefined);
  const expression: ['dataModel', string] = ['dataModel', 'unknownField'];
  const { result } = renderHook(() =>
    useEvalExpressionCallback(expression, Expressions.RepeatingGroup.edit.saveButton),
  );
  expect(logError).not.toHaveBeenCalled();
  expect(result.current()).toBe(true);
  expect(logError).toHaveBeenCalled();
});
