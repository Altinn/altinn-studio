import { all, call, select, take, takeLatest } from 'redux-saga/effects';
import { expectSaga } from 'redux-saga-test-plan';

import { ApplicationMetadataActions } from 'src/features/applicationMetadata/applicationMetadataSlice';
import { FormLayoutActions } from 'src/features/layout/formLayoutSlice';
import { ProfileActions } from 'src/features/profile/profileSlice';
import {
  fetchTextResources,
  watchFetchTextResourcesSaga,
} from 'src/features/textResources/fetch/fetchTextResourcesSagas';
import { TextResourcesActions } from 'src/features/textResources/textResourcesSlice';
import { staticUseLanguageForTests, staticUseLanguageFromState } from 'src/hooks/useLanguage';
import { makeGetAllowAnonymousSelector } from 'src/selectors/getAllowAnonymous';
import { httpGet } from 'src/utils/network/networking';
import { waitFor } from 'src/utils/sagas';
import { textResourcesUrl } from 'src/utils/urls/appUrlHelper';

describe('fetchTextResourcesSagas', () => {
  it('should dispatch action fetchTextResources', async () => {
    const generator = watchFetchTextResourcesSaga();
    expect(generator.next().value).toEqual(
      all([
        take(FormLayoutActions.fetchSetsFulfilled),
        take(ApplicationMetadataActions.getFulfilled),
        take(TextResourcesActions.fetch),
      ]),
    );
    expect(generator.next().value).toEqual(select(makeGetAllowAnonymousSelector()));
    expect(generator.next().value).toEqual(await waitFor(expect.anything()));
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
        [select(staticUseLanguageFromState), staticUseLanguageForTests({ selectedAppLanguage: 'nb' })],
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
        [select(staticUseLanguageFromState), staticUseLanguageForTests({ selectedAppLanguage: 'en' })],
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
        [select(staticUseLanguageFromState), staticUseLanguageForTests({ selectedAppLanguage: 'en' })],
        [select(makeGetAllowAnonymousSelector()), false],
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
