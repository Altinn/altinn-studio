import { renderHookWithMockStore } from '../testing/mocks';
import { appDataMock } from '../testing/stateMocks';
import { useText } from './useText';
import type { IAppDataState } from '../features/appData/appDataReducers';
import { mockUseTranslation } from '../../../../testing/mocks/i18nMock';

// Test data:
const text = 'Lorem ipsum';
const textKey = 'test';
const notExistingKey = 'some-key';

// Mocks:
jest.mock('react-i18next', () => ({
  useTranslation: () => mockUseTranslation({ [textKey]: text }),
}));

describe('useText', () => {
  it('Returns text corresponding to given key', () => expect(renderAndRun(textKey)).toBe(text));
  it('Returns key if it is not present in the store', () =>
    expect(renderAndRun(notExistingKey)).toBe(notExistingKey));
});

const renderAndRun = (key: string) => {
  const appData: IAppDataState = { ...appDataMock };
  return renderHookWithMockStore({ appData })(() => useText()).renderHookResult.result.current(key);
};
