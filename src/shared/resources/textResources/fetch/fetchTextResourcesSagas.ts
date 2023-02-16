import { all, call, put, select, take, takeLatest } from 'redux-saga/effects';
import type { SagaIterator } from 'redux-saga';

import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { appLanguageStateSelector } from 'src/selectors/appLanguageStateSelector';
import { makeGetAllowAnonymousSelector } from 'src/selectors/getAllowAnonymous';
import { ApplicationMetadataActions } from 'src/shared/resources/applicationMetadata/applicationMetadataSlice';
import { LanguageActions } from 'src/shared/resources/language/languageSlice';
import { QueueActions } from 'src/shared/resources/queue/queueSlice';
import { TextResourcesActions } from 'src/shared/resources/textResources/textResourcesSlice';
import { httpGet } from 'src/utils/network/networking';
import { waitFor } from 'src/utils/sagas';
import { oldTextResourcesUrl, textResourcesUrl } from 'src/utils/urls/appUrlHelper';

export function* fetchTextResources(): SagaIterator {
  try {
    const appLanguage = yield select(appLanguageStateSelector);
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
  yield takeLatest(LanguageActions.updateSelectedAppLanguage, fetchTextResources);
}
