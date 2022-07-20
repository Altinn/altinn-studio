import { all, call, put, select, take, takeLatest } from 'redux-saga/effects';
import type { SagaIterator } from 'redux-saga';

import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { appLanguageStateSelector } from 'src/selectors/appLanguageStateSelector';
import { makeGetAllowAnonymousSelector } from 'src/selectors/getAllowAnonymous';
import { ApplicationMetadataActions } from 'src/shared/resources/applicationMetadata/applicationMetadataSlice';
import { LanguageActions } from 'src/shared/resources/language/languageSlice';
import { ProfileActions } from 'src/shared/resources/profile/profileSlice';
import { QueueActions } from 'src/shared/resources/queue/queueSlice';
import { TextResourcesActions } from 'src/shared/resources/textResources/textResourcesSlice';
import { oldTextResourcesUrl, textResourcesUrl } from 'src/utils/appUrlHelper';
import { get } from 'src/utils/networking';

export function* fetchTextResources(): SagaIterator {
  try {
    const appLanguage = yield select(appLanguageStateSelector);
    let resource: any;
    try {
      resource = yield call(get, textResourcesUrl(appLanguage));
    } catch (error) {
      if (error.response.status !== 200) {
        resource = yield call(get, oldTextResourcesUrl);
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
    yield take(ProfileActions.fetchFulfilled);
  }
  yield call(fetchTextResources);
  yield takeLatest(TextResourcesActions.fetch, fetchTextResources);
  yield takeLatest(
    LanguageActions.updateSelectedAppLanguage,
    fetchTextResources,
  );
}
