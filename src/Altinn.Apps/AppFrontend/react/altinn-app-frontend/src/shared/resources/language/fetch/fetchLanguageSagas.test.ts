import { call, take, all } from 'redux-saga/effects';

import {
  fetchLanguageSaga,
  watchFetchLanguageSaga,
} from './fetchLanguageSagas';
import LanguageActions from '../languageActions';

describe('languageActions', () => {
  it('should create an action with correct type: FETCH_LANGUAGE', () => {
    const expectedAction = {
      type: 'LANGUAGE_DATA.FETCH_LANGUAGE',
    };
    expect(LanguageActions.fetchLanguage()).toEqual(expectedAction);
  });
  it('should create an action with correct type: FETCH_LANGUAGE_FULFILLED', () => {
    const expectedAction = {
      type: 'LANGUAGE_DATA.FETCH_LANGUAGE_FULFILLED',
      language: {},
    };
    expect(LanguageActions.fetchLanguageFulfilled({})).toEqual(expectedAction);
  });
  it('should create an action with correct type: FETCH_LANGUAGE_REJECTED', () => {
    const mockError: Error = new Error();
    const expectedAction = {
      type: 'LANGUAGE_DATA.FETCH_LANGUAGE_REJECTED',
      error: mockError,
    };
    expect(LanguageActions.fetchLanguageRecjeted(mockError)).toEqual(
      expectedAction,
    );
  });
});

describe('fetchLanguageSagas', () => {
  it('should dispatch action "LANGUAGE_DATA.FETCH_LANGUAGE" ', () => {
    const generator = watchFetchLanguageSaga();
    expect(generator.next().value).toEqual(
      all([
        take('LANGUAGE_DATA.FETCH_LANGUAGE'),
        take('PROFILE.FETCH_PROFILE_FULFILLED'),
      ]),
    );
    expect(generator.next().value).toEqual(call(fetchLanguageSaga));
    expect(generator.next().done).toBeTruthy();
  });
});
