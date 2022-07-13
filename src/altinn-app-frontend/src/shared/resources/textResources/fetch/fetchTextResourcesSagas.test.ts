import { all, call, select, take, takeLatest } from 'redux-saga/effects';
import { expectSaga } from 'redux-saga-test-plan';

import {
  watchFetchTextResourcesSaga,
  fetchTextResources,
  allowAnonymousSelector,
} from './fetchTextResourcesSagas';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { profileStateSelector } from 'src/selectors/simpleSelectors';
import type { IProfile } from 'altinn-shared/types';
import { get } from 'src/utils/networking';
import { textResourcesUrl } from 'src/utils/appUrlHelper';
import { TextResourcesActions } from '../textResourcesSlice';
import { appLanguageStateSelector } from 'src/selectors/appLanguageStateSelector';
import { LanguageActions } from 'src/shared/resources/language/languageSlice';
import { ApplicationMetadataActions } from 'src/shared/resources/applicationMetadata/applicationMetadataSlice';
import { ProfileActions } from 'src/shared/resources/profile/profileSlice';

describe('fetchTextResourcesSagas', () => {
  it('should dispatch action fetchTextResources', () => {
    const generator = watchFetchTextResourcesSaga();
    expect(generator.next().value).toEqual(
      all([
        take(FormLayoutActions.fetchSetsFulfilled),
        take(ApplicationMetadataActions.getFulfilled),
        take(TextResourcesActions.fetch),
      ]),
    );
    expect(generator.next().value).toEqual(select(allowAnonymousSelector));
    expect(generator.next().value).toEqual(take(ProfileActions.fetchFulfilled));
    expect(generator.next().value).toEqual(call(fetchTextResources));
    expect(generator.next().value).toEqual(
      takeLatest(TextResourcesActions.fetch, fetchTextResources),
    );
    expect(generator.next().value).toEqual(
      takeLatest(LanguageActions.updateSelectedAppLanguage, fetchTextResources),
    );
    expect(generator.next().done).toBeTruthy();
  });
  it('should fetch text resources using default language when allowAnonymous is true', () => {
    const mockTextResource = {
      language: 'nb',
      resources: [
        {
          id: 'id1',
          value: 'This is a text',
        },
      ],
    };
    expectSaga(fetchTextResources)
      .provide([
        [select(appLanguageStateSelector), 'nb'],
        [select(allowAnonymousSelector), true],
        [call(get, textResourcesUrl('nb')), mockTextResource],
      ])
      .put(
        TextResourcesActions.fetchFulfilled({
          language: 'nb',
          resources: mockTextResource.resources,
        }),
      )
      .run();
  });
  it('should run fetch text resources using app language', () => {
    const mockTextResource = {
      language: 'en',
      resources: [
        {
          id: 'id1',
          value: 'This is a text',
        },
      ],
    };
    return expectSaga(fetchTextResources)
      .provide([
        [select(appLanguageStateSelector), 'en'],
        [call(get, textResourcesUrl('en')), mockTextResource],
      ])
      .put(
        TextResourcesActions.fetchFulfilled({
          language: 'en',
          resources: mockTextResource.resources,
        }),
      )
      .run();
  });
  it('should run fetch text resources using app language', () => {
    const profileMock: IProfile = {
      userId: 1,
      userName: '',
      partyId: 1234,
      party: null,
      userType: 1,
      profileSettingPreference: {
        doNotPromptForParty: false,
        language: 'nb',
        preSelectedPartyId: 0,
      },
    };
    const mockTextResource = {
      language: 'en',
      resources: [
        {
          id: 'id1',
          value: 'This is a text',
        },
      ],
    };
    return expectSaga(fetchTextResources)
      .provide([
        [select(appLanguageStateSelector), 'en'],
        [select(allowAnonymousSelector), false],
        [select(profileStateSelector), profileMock],
        [call(get, textResourcesUrl('en')), mockTextResource],
      ])
      .put(
        TextResourcesActions.fetchFulfilled({
          language: 'en',
          resources: mockTextResource.resources,
        }),
      )
      .run();
  });
});
