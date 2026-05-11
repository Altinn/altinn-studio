import { renderHookWithProviders } from '../testing/mocks';
import { useText } from './useText';
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
  return renderHookWithProviders(() => useText()).result.current(key);
};
