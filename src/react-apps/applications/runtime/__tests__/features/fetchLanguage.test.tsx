import 'jest';
import { call, takeLatest } from 'redux-saga/effects';
import LanguageActions from '../../src/features/languages/actions';
import { fetchLanguageSaga, watchFetchLanguageSaga } from '../../src/features/languages/sagas/fetch';

const mockUrl: string = 'http://altinn3.no/runtime/api/Language/GetLanguageAsJSON';
const mockLanguageCode: string = 'nb';

describe('>>> features/language action', () => {
  it('+++ should create an action with correct type', () => {
    const expectedAction = {
      type: 'LANGUAGE_DATA.FETCH_LANGUAGE',
      languageCode: mockLanguageCode,
      url: mockUrl,
    };
    expect(LanguageActions.fetchLanguage(mockUrl, mockLanguageCode)).toEqual(expectedAction);
  });
});

describe('>>> features/language saga', () => {
  it('+++ should dispatch action "LANGUAGE_DATA.FETCH_LANGUAGE" ', () => {
    const generator = watchFetchLanguageSaga();
    expect(generator.next().value)
      .toEqual(takeLatest('LANGUAGE_DATA.FETCH_LANGUAGE', fetchLanguageSaga));
    expect(generator.next().done).toBeTruthy();
  });

  it('+++ should dispatch action "LANGUAGE_DATA.FETCH_LANGUAGE_FULFILLED" with result from language API', () => {
    const mockResponse = { runtime: { some_key: 'test' } };
    const generator = fetchLanguageSaga(LanguageActions.fetchLanguage(mockUrl, mockLanguageCode));
    generator.next();
    expect(generator.next(mockResponse).value)
      .toEqual(call(LanguageActions.fetchLanguageFulfilled, mockResponse));
    expect(generator.next().done).toBeTruthy();
  });
});
