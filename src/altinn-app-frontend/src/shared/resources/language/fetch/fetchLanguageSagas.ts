import type { SagaIterator } from 'redux-saga';
import { call, put, all, take, select, takeLatest } from 'redux-saga/effects';

import { getLanguageFromCode } from 'altinn-shared/language';
import { LanguageActions } from '../languageSlice';
import { QueueActions } from '../../queue/queueSlice';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { appLanguageStateSelector } from 'src/selectors/appLanguageStateSelector';
import { makeGetAllowAnonymousSelector } from 'src/selectors/getAllowAnonymous';
import { ApplicationMetadataActions } from 'src/shared/resources/applicationMetadata/applicationMetadataSlice';
import { ProfileActions } from 'src/shared/resources/profile/profileSlice';

export function* fetchLanguageSaga(defaultLanguage = false): SagaIterator {
  try {
    const languageCode =
      defaultLanguage === true ? 'nb' : yield select(appLanguageStateSelector);
    const language = getLanguageFromCode(languageCode);
    yield put(LanguageActions.fetchLanguageFulfilled({ language }));
  } catch (error) {
    yield put(LanguageActions.fetchLanguageRejected({ error }));
    yield put(QueueActions.appTaskQueueError({ error }));
  }
}

export function* watchFetchLanguageSaga(): SagaIterator {
  yield all([
    take(FormLayoutActions.fetchSetsFulfilled),
    take(ApplicationMetadataActions.getFulfilled),
    take(LanguageActions.fetchLanguage),
  ]);

  const allowAnonymous = yield select(makeGetAllowAnonymousSelector());
  if (!allowAnonymous) {
    yield take(ProfileActions.fetchFulfilled);
  }

  yield call(fetchLanguageSaga);
  yield takeLatest(
    LanguageActions.updateSelectedAppLanguage,
    fetchLanguageSaga,
  );
}
