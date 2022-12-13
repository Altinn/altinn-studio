import { appDataMock, languageStateMock, renderHookWithMockStore } from '../testing/mocks';
import { useText } from './useText';
import { IAppDataState } from '../features/appData/appDataReducers';

// Test data:
const text = 'Lorem ipsum';
const textKey = 'test';
const notExistingKey = 'some-key';

describe('useText', () => {
  it(
    'Returns text corresponding to given key',
    () => expect(renderAndRun(textKey)).toBe(text)
  );
  it(
    'Returns key if it is not present in the store',
    () => expect(renderAndRun(notExistingKey)).toBe(notExistingKey)
  );
});

const renderAndRun = (key: string) => {
  const appData: IAppDataState = {
    ...appDataMock,
    languageState: {
      ...languageStateMock,
      language: { [textKey]: text },
    },
  };
  return renderHookWithMockStore({ appData })(() => useText())
    .renderHookResult
    .result
    .current(key);
}
