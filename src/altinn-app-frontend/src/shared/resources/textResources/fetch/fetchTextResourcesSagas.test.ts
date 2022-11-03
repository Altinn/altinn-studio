import { all, call, select, take, takeLatest } from 'redux-saga/effects';
import { expectSaga } from 'redux-saga-test-plan';

import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { appLanguageStateSelector } from 'src/selectors/appLanguageStateSelector';
import { makeGetAllowAnonymousSelector } from 'src/selectors/getAllowAnonymous';
import { profileStateSelector } from 'src/selectors/simpleSelectors';
import { ApplicationMetadataActions } from 'src/shared/resources/applicationMetadata/applicationMetadataSlice';
import { LanguageActions } from 'src/shared/resources/language/languageSlice';
import {
  fetchTextResources,
  watchFetchTextResourcesSaga,
} from 'src/shared/resources/textResources/fetch/fetchTextResourcesSagas';
import { TextResourcesActions } from 'src/shared/resources/textResources/textResourcesSlice';
import { textResourcesUrl } from 'src/utils/appUrlHelper';
import { get } from 'src/utils/networking';
import { waitFor } from 'src/utils/sagas';

import type { IProfile } from 'altinn-shared/types';

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
    expect(generator.next().value).toEqual(takeLatest(LanguageActions.updateSelectedAppLanguage, fetchTextResources));
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
