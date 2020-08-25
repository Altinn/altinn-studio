import 'jest';
import { call, take, all } from 'redux-saga/effects';
import { fetchLanguageSaga, watchFetchLanguageSaga } from '../../../src/resources/language/fetch/fetchLanguageSagas';
import LanguageActions from '../../../src/resources/language/languageActions';

describe('>>> features/language action', () => {
  it('+++ should create an action with correct type: FETCH_LANGUAGE', () => {
    const expectedAction = {
      type: 'LANGUAGE_DATA.FETCH_LANGUAGE',
    };
    expect(LanguageActions.fetchLanguage()).toEqual(expectedAction);
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
      .toEqual(all([take('LANGUAGE_DATA.FETCH_LANGUAGE'), take('PROFILE.FETCH_PROFILE_FULFILLED')]));
    expect (generator.next().value).toEqual(call(fetchLanguageSaga));
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
