import type { SagaIterator } from "redux-saga";
import { all, call, put, select, take, takeLatest } from "redux-saga/effects";
import { get } from "src/utils/networking";
import { textResourcesUrl, oldTextResourcesUrl } from "src/utils/appUrlHelper";
import TextResourcesActions from "../textResourcesActions";
import { appTaskQueueError } from "../../queue/queueSlice";
import { FETCH_TEXT_RESOURCES } from "./fetchTextResourcesActionTypes";
import { FETCH_PROFILE_FULFILLED } from "../../profile/fetch/fetchProfileActionTypes";
import { FETCH_APPLICATION_METADATA_FULFILLED } from "src/shared/resources/applicationMetadata/actions/types";
import { FormLayoutActions } from "src/features/form/layout/formLayoutSlice";
import { makeGetAllowAnonymousSelector } from "src/selectors/getAllowAnonymous";
import { appLanguageStateSelector } from "src/selectors/appLanguageStateSelector";
import { LanguageActions } from "src/shared/resources/language/languageSlice";

export const allowAnonymousSelector = makeGetAllowAnonymousSelector();

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
    yield call(
      TextResourcesActions.fetchTextResourcesFulfilled,
      resource.language,
      resource.resources
    );
  } catch (error) {
    yield call(TextResourcesActions.fetchTextResourcesRejected, error);
    yield put(appTaskQueueError({ error }));
  }
}

export function* watchFetchTextResourcesSaga(): SagaIterator {
  yield all([
    take(FormLayoutActions.fetchLayoutSetsFulfilled),
    take(FETCH_APPLICATION_METADATA_FULFILLED),
    take(FETCH_TEXT_RESOURCES),
  ]);

  const allowAnonymous = yield select(allowAnonymousSelector);

  if (!allowAnonymous) {
    yield take(FETCH_PROFILE_FULFILLED);
  }
  yield call(fetchTextResources);
  yield takeLatest(FETCH_TEXT_RESOURCES, fetchTextResources);
  yield takeLatest(
    LanguageActions.updateSelectedAppLanguage,
    fetchTextResources
  );
}
