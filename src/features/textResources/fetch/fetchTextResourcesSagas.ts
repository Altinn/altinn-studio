import { all, call, put, select, take, takeLatest } from 'redux-saga/effects';
import type { SagaIterator } from 'redux-saga';

import { ApplicationMetadataActions } from 'src/features/applicationMetadata/applicationMetadataSlice';
import { FormLayoutActions } from 'src/features/layout/formLayoutSlice';
import { ProfileActions } from 'src/features/profile/profileSlice';
import { QueueActions } from 'src/features/queue/queueSlice';
import { TextResourcesActions } from 'src/features/textResources/textResourcesSlice';
import { staticUseLanguageFromState } from 'src/hooks/useLanguage';
import { makeGetAllowAnonymousSelector } from 'src/selectors/getAllowAnonymous';
import { httpGet } from 'src/utils/network/networking';
import { waitFor } from 'src/utils/sagas';
import { oldTextResourcesUrl, textResourcesUrl } from 'src/utils/urls/appUrlHelper';
import type { IUseLanguage } from 'src/hooks/useLanguage';

export function* fetchTextResources(): SagaIterator {
  try {
    const langTools: IUseLanguage = yield select(staticUseLanguageFromState);
    const appLanguage = langTools.selectedLanguage;
    let resource: any;
    try {
      resource = yield call(httpGet, textResourcesUrl(appLanguage));
    } catch (error) {
      if (error.response.status !== 200) {
        window.logWarn('Failed to fetch text resources, trying legacy method instead:\n', error);
        resource = yield call(httpGet, oldTextResourcesUrl);
      }
    }

    yield put(
      TextResourcesActions.fetchFulfilled({
        language: resource.language,
        resources: resource.resources,
      }),
    );
  } catch (error) {
    if (error.message?.includes('404')) {
      yield put(TextResourcesActions.fetchRejected({ error: null }));
      window.logWarn('Text resources not found:\n', error);
    } else {
      yield put(TextResourcesActions.fetchRejected({ error }));
      yield put(QueueActions.appTaskQueueError({ error }));
      window.logError('Fetching text resources failed:\n', error);
    }
  }
}

export function* watchFetchTextResourcesSaga(): SagaIterator {
  yield all([
    take(FormLayoutActions.fetchSetsFulfilled),
    take(ApplicationMetadataActions.getFulfilled),
    take(TextResourcesActions.fetch),
  ]);

  const allowAnonymous = yield select(makeGetAllowAnonymousSelector());
  if (!allowAnonymous) {
    // The currently selected language in the profile is preset to 'nb' when this state is initialized, so we
    // cannot trust it until the profile is properly fetched (having a userId when not anonymous)
    yield waitFor((state) => state.profile.profile?.userId !== undefined);
  }

  yield call(fetchTextResources);
  yield takeLatest(TextResourcesActions.fetch, fetchTextResources);
  yield takeLatest(ProfileActions.updateSelectedAppLanguage, fetchTextResources);
}
