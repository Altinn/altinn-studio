import { call, take, all, select } from 'redux-saga/effects';
import { expectSaga } from 'redux-saga-test-plan';

import {
  fetchLanguageSaga,
  watchFetchLanguageSaga,
  allowAnonymousSelector,
} from './fetchLanguageSagas';
import { profileStateSelector } from 'src/selectors/simpleSelectors';
import { LanguageActions } from '../languageSlice';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { getLanguageFromCode } from 'altinn-shared/language';
import type { IProfile } from 'altinn-shared/types';
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
    expect(LanguageActions.fetchLanguageFulfilled({ language: {} })).toEqual(expectedAction);
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
        take(FormLayoutActions.fetchLayoutSetsFulfilled),
        take('APPLICATION_METADATA.FETCH_APPLICATION_METADATA_FULFILLED'),
        take(LanguageActions.fetchLanguage),
      ]),
    );
    expect(generator.next().value).toEqual(select(allowAnonymousSelector));
    expect(generator.next().value).toEqual(take('PROFILE.FETCH_PROFILE_FULFILLED'));
    expect(generator.next().value).toEqual(call(fetchLanguageSaga));
    expect(generator.next().done).toBeTruthy();
  });

  it('should fetch default language when allowAnonymous is true', () => {

    return expectSaga(fetchLanguageSaga)
      .provide([
        [select(allowAnonymousSelector), true],
      ])
      .put(LanguageActions.fetchLanguageFulfilled({ language: getLanguageFromCode('nb') }))
      .run();
  });

  it('should fetch default language when defaultLanguage is true', () => {

    return expectSaga(fetchLanguageSaga, true)
      .put(LanguageActions.fetchLanguageFulfilled({ language: getLanguageFromCode('nb') }))
      .run();
  });

  it('should fetch language from profile settings when allowAnonymous is false', () => {
    const profileMock: IProfile = {
      userId: 1,
      userName: '',
      partyId: 1234,
      party: null,
      userType: 1,
      profileSettingPreference: {
        doNotPromptForParty: false,
        language: 'en',
        preSelectedPartyId: 0,
      }
    };
    return expectSaga(fetchLanguageSaga)
      .provide([
        [select(allowAnonymousSelector), false],
        [select(profileStateSelector), profileMock]
      ])
      .put(LanguageActions.fetchLanguageFulfilled({ language: getLanguageFromCode('en') }))
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
  })
});
