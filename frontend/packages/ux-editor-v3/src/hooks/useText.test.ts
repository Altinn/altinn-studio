import { renderHookWithMockStore } from '../testing/mocks';
import { appDataMock } from '../testing/stateMocks';
import { useText } from './useText';
import type { IAppDataState } from '../features/appData/appDataReducers';
import { textMock } from '@studio/testing/mocks/i18nMock';

// Test data:
const textKey = 'test';
const notExistingKey = 'some-key';

describe('useText', () => {
  it('Returns text corresponding to given key', () =>
    expect(renderAndRun(textKey)).toBe(textMock(textKey)));
  it('Returns key if it is not present in the store', () =>
    expect(renderAndRun(notExistingKey)).toBe(textMock(notExistingKey)));
});

const renderAndRun = (key: string) => {
  const appData: IAppDataState = { ...appDataMock };
  return renderHookWithMockStore({ appData })(() => useText()).renderHookResult.result.current(key);
};
