import 'jest';
import { call, takeLatest } from 'redux-saga/effects';
import { fetchLanguageSaga, watchFetchLanguageSaga } from '../../../src/shared/resources/language/fetch/fetchLanguageSagas';
import LanguageActions from '../../../src/shared/resources/language/languageActions';

const mockUrl: string = 'http://altinn3.no/api/Language/GetLanguageAsJSON';
const mockLanguageCode: string = 'nb';

describe('>>> features/language action', () => {
  it('+++ should create an action with correct type: FETCH_LANGUAGE', () => {
    const expectedAction = {
      type: 'LANGUAGE_DATA.FETCH_LANGUAGE',
      languageCode: mockLanguageCode,
      url: mockUrl,
    };
    expect(LanguageActions.fetchLanguage(mockUrl, mockLanguageCode)).toEqual(expectedAction);
  });
  it('+++ should create an action with correct type: FETCH_LANGUAGE_FULFILLED', () => {
    const expectedAction = {
      type: 'LANGUAGE_DATA.FETCH_LANGUAGE_FULFILLED',
      language: {},
    };
    expect(LanguageActions.fetchLanguageFulfilled({})).toEqual(expectedAction);
  });
  it('+++ should create an action with correct type: FETCH_LANGUAGE_REJECTED', () => {
    const mockError: Error = new Error();
    const expectedAction = {
      type: 'LANGUAGE_DATA.FETCH_LANGUAGE_REJECTED',
      error: mockError,
    };
    expect(LanguageActions.fetchLanguageRecjeted(mockError)).toEqual(expectedAction);
  });
});

describe('>>> features/language saga', () => {
  it('+++ should dispatch action "LANGUAGE_DATA.FETCH_LANGUAGE" ', () => {
    const generator = watchFetchLanguageSaga();
    expect(generator.next().value)
      .toEqual(takeLatest('LANGUAGE_DATA.FETCH_LANGUAGE', fetchLanguageSaga));
    expect(generator.next().done).toBeTruthy();
  });

  // it('+++ should dispatch action "LANGUAGE_DATA.FETCH_LANGUAGE_FULFILLED" with result from language API', () => {
  //   const mockResponse = { runtime: { some_key: 'test' } };
  //   const generator = fetchLanguageSaga(LanguageActions.fetchLanguage(mockUrl, mockLanguageCode));
  //   generator.next();
  //   expect(generator.next(mockResponse).value)
  //     .toEqual(call(LanguageActions.fetchLanguageFulfilled, mockResponse));
  //   expect(generator.next().done).toBeTruthy();
  // });
});
