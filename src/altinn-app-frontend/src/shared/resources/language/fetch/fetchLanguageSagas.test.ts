import { all, call, select, take, takeLatest } from 'redux-saga/effects';
import { expectSaga } from 'redux-saga-test-plan';

import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { appLanguageStateSelector } from 'src/selectors/appLanguageStateSelector';
import { makeGetAllowAnonymousSelector } from 'src/selectors/getAllowAnonymous';
import { ApplicationMetadataActions } from 'src/shared/resources/applicationMetadata/applicationMetadataSlice';
import {
  fetchLanguageSaga,
  watchFetchLanguageSaga,
} from 'src/shared/resources/language/fetch/fetchLanguageSagas';
import { LanguageActions } from 'src/shared/resources/language/languageSlice';
import { ProfileActions } from 'src/shared/resources/profile/profileSlice';

import { getLanguageFromCode } from 'altinn-shared/language';
import * as language from 'altinn-shared/language';

describe('languageActions', () => {
  it('should create an action with correct type: FETCH_LANGUAGE', () => {
    const expectedAction = {
      type: 'language/fetchLanguage',
    };
    expect(LanguageActions.fetchLanguage()).toEqual(expectedAction);
  });
  it('should create an action with correct type: FETCH_LANGUAGE_FULFILLED', () => {
    const expectedAction = {
      type: 'language/fetchLanguageFulfilled',
      payload: {
        language: {},
      },
    };
    expect(LanguageActions.fetchLanguageFulfilled({ language: {} })).toEqual(
      expectedAction,
    );
  });
  it('should create an action with correct type: FETCH_LANGUAGE_REJECTED', () => {
    const mockError: Error = new Error();
    const expectedAction = {
      type: 'language/fetchLanguageRejected',
      payload: {
        error: mockError,
      },
    };
    expect(LanguageActions.fetchLanguageRejected({ error: mockError })).toEqual(
      expectedAction,
    );
  });
});

describe('fetchLanguageSagas', () => {
  it('should dispatch action "language/fetchLanguage" ', () => {
    const generator = watchFetchLanguageSaga();
    expect(generator.next().value).toEqual(
      all([
        take(FormLayoutActions.fetchSetsFulfilled),
        take(ApplicationMetadataActions.getFulfilled),
        take(LanguageActions.fetchLanguage),
      ]),
    );
    expect(generator.next().value).toEqual(
      select(makeGetAllowAnonymousSelector()),
    );
    expect(generator.next().value).toEqual(take(ProfileActions.fetchFulfilled));
    expect(generator.next().value).toEqual(call(fetchLanguageSaga));
    expect(generator.next().value).toEqual(
      takeLatest(LanguageActions.updateSelectedAppLanguage, fetchLanguageSaga),
    );
    expect(generator.next().done).toBeTruthy();
  });

  it('should fetch default language when defaultLanguage is true', () => {
    return expectSaga(fetchLanguageSaga, true)
      .provide([[select(appLanguageStateSelector), 'en']])
      .put(
        LanguageActions.fetchLanguageFulfilled({
          language: getLanguageFromCode('nb'),
        }),
      )
      .run();
  });

  it('should fetch language from app language state', () => {
    return expectSaga(fetchLanguageSaga)
      .provide([[select(appLanguageStateSelector), 'en']])
      .put(
        LanguageActions.fetchLanguageFulfilled({
          language: getLanguageFromCode('en'),
        }),
      )
      .run();
  });

  it('should handle error in fetchLanguageSaga', () => {
    const error = new Error('error');
    jest.spyOn(language, 'getLanguageFromCode').mockImplementation(() => {
      throw error;
    });
    expectSaga(fetchLanguageSaga, true)
      .put(LanguageActions.fetchLanguageRejected({ error }))
      .run();
  });
});
