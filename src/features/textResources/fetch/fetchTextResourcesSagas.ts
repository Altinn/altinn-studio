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
        resource = yield call(httpGet, oldTextResourcesUrl);
      }
    }

    resource.resources.forEach((res) => {
      if (res.variables != null) {
        res.unparsedValue = res.value;
      }
    });
    yield put(
      TextResourcesActions.fetchFulfilled({
        language: resource.language,
        resources: resource.resources,
      }),
    );
  } catch (error) {
    yield put(TextResourcesActions.fetchRejected({ error }));
    yield put(QueueActions.appTaskQueueError({ error }));
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
