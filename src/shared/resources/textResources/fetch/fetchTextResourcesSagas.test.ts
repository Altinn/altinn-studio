import { all, call, select, take, takeLatest } from 'redux-saga/effects';
import { expectSaga } from 'redux-saga-test-plan';

import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { appLanguageStateSelector } from 'src/selectors/appLanguageStateSelector';
import { makeGetAllowAnonymousSelector } from 'src/selectors/getAllowAnonymous';
import { profileStateSelector } from 'src/selectors/simpleSelectors';
import { ApplicationMetadataActions } from 'src/shared/resources/applicationMetadata/applicationMetadataSlice';
import { ProfileActions } from 'src/shared/resources/profile/profileSlice';
import {
  fetchTextResources,
  watchFetchTextResourcesSaga,
} from 'src/shared/resources/textResources/fetch/fetchTextResourcesSagas';
import { TextResourcesActions } from 'src/shared/resources/textResources/textResourcesSlice';
import { httpGet } from 'src/utils/network/networking';
import { waitFor } from 'src/utils/sagas';
import { textResourcesUrl } from 'src/utils/urls/appUrlHelper';
import type { IProfile } from 'src/types/shared';

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
    expect(generator.next().value).toEqual(select(makeGetAllowAnonymousSelector()));
    expect(generator.next().value).toEqual(waitFor(expect.anything()));
    expect(generator.next().value).toEqual(call(fetchTextResources));
    expect(generator.next().value).toEqual(takeLatest(TextResourcesActions.fetch, fetchTextResources));
    expect(generator.next().value).toEqual(takeLatest(ProfileActions.updateSelectedAppLanguage, fetchTextResources));
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
        [select(makeGetAllowAnonymousSelector()), true],
        [call(httpGet, textResourcesUrl('nb')), mockTextResource],
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
        [call(httpGet, textResourcesUrl('en')), mockTextResource],
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
        [select(makeGetAllowAnonymousSelector()), false],
        [select(profileStateSelector), profileMock],
        [call(httpGet, textResourcesUrl('en')), mockTextResource],
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
