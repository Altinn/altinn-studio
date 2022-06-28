import type { SagaIterator } from "redux-saga";
import { call, put, all, take, select, takeLatest } from "redux-saga/effects";

import { getLanguageFromCode } from "altinn-shared/language";
import { LanguageActions } from "../languageSlice";
import * as ProfileActionTypes from "../../profile/fetch/fetchProfileActionTypes";
import { appTaskQueueError } from "../../queue/queueSlice";
import { FormLayoutActions } from "src/features/form/layout/formLayoutSlice";
import { FETCH_APPLICATION_METADATA_FULFILLED } from "../../applicationMetadata/actions/types";
import { appLanguageStateSelector } from "src/selectors/appLanguageStateSelector";
import { makeGetAllowAnonymousSelector } from "src/selectors/getAllowAnonymous";

export const allowAnonymousSelector = makeGetAllowAnonymousSelector();

export function* fetchLanguageSaga(defaultLanguage = false): SagaIterator {
  try {
    const languageCode =
      defaultLanguage === true ? "nb" : yield select(appLanguageStateSelector);
    const language = getLanguageFromCode(languageCode);
    yield put(LanguageActions.fetchLanguageFulfilled({ language }));
  } catch (error) {
    yield put(LanguageActions.fetchLanguageRejected({ error }));
    yield put(appTaskQueueError({ error }));
  }
}

export function* watchFetchLanguageSaga(): SagaIterator {
  yield all([
    take(FormLayoutActions.fetchLayoutSetsFulfilled),
    take(FETCH_APPLICATION_METADATA_FULFILLED),
    take(LanguageActions.fetchLanguage),
  ]);

  const allowAnonymous = yield select(allowAnonymousSelector);
  if (!allowAnonymous) {
    yield take(ProfileActionTypes.FETCH_PROFILE_FULFILLED);
  }

  yield call(fetchLanguageSaga);
  yield takeLatest(
    LanguageActions.updateSelectedAppLanguage,
    fetchLanguageSaga
  );
}

export function* watchFetchDefaultLanguageSaga(): SagaIterator {
  yield take(LanguageActions.fetchDefaultLanguage);
  yield call(fetchLanguageSaga, true);
}
