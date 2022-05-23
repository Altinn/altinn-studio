import { all, call, select, take } from 'redux-saga/effects';
import { expectSaga } from 'redux-saga-test-plan';

import { watchFetchTextResourcesSaga,
  fetchTextResources,
  allowAnonymousSelector } from './fetchTextResourcesSagas';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { FETCH_TEXT_RESOURCES } from './fetchTextResourcesActionTypes';
import { FETCH_APPLICATION_METADATA_FULFILLED } from 'src/shared/resources/applicationMetadata/actions/types';
import { FETCH_PROFILE_FULFILLED } from '../../profile/fetch/fetchProfileActionTypes';
import { profileStateSelector } from 'src/selectors/simpleSelectors';
import { IProfile } from 'altinn-shared/types';
import { get } from 'src/utils/networking';
import { textResourcesUrl } from 'src/utils/appUrlHelper';
import TextResourcesActions from '../textResourcesActions';

describe('fetchTextResourcesSagas', () => {
  it('should dispatch action fetchTextResources', () => {
    const generator = watchFetchTextResourcesSaga();
    expect(generator.next().value).toEqual(
      all([
        take(FormLayoutActions.fetchLayoutSetsFulfilled),
        take(FETCH_APPLICATION_METADATA_FULFILLED),
        take(FETCH_TEXT_RESOURCES)
      ]),
    );
    expect(generator.next().value).toEqual(select(allowAnonymousSelector));
    expect(generator.next().value).toEqual(take(FETCH_PROFILE_FULFILLED));
    expect(generator.next().value).toEqual(call(fetchTextResources));
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
      [select(allowAnonymousSelector), true],
      [call(get, textResourcesUrl('nb')), mockTextResource],
    ])
    .call(TextResourcesActions.fetchTextResourcesFulfilled, 'nb', mockTextResource.resources)
    .run();
  })
  it('should run fetch text resources using profile language', () => {
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
      [select(allowAnonymousSelector), false],
      [select(profileStateSelector), profileMock],
      [call(get, textResourcesUrl('en')), mockTextResource]
    ])
    .call(TextResourcesActions.fetchTextResourcesFulfilled, 'en', mockTextResource.resources)
    .run();
  })
})
