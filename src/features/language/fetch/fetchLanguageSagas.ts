import { all, call, put, select, take, takeLatest } from 'redux-saga/effects';
import type { SagaIterator } from 'redux-saga';

import { ApplicationMetadataActions } from 'src/features/applicationMetadata/applicationMetadataSlice';
import { LanguageActions } from 'src/features/language/languageSlice';
import { FormLayoutActions } from 'src/features/layout/formLayoutSlice';
import { ProfileActions } from 'src/features/profile/profileSlice';
import { QueueActions } from 'src/features/queue/queueSlice';
import { getLanguageFromCode } from 'src/language/languages';
import { appLanguageStateSelector } from 'src/selectors/appLanguageStateSelector';
import { makeGetAllowAnonymousSelector } from 'src/selectors/getAllowAnonymous';
import { waitFor } from 'src/utils/sagas';

export function* fetchLanguageSaga(defaultLanguage = false): SagaIterator {
  try {
    const languageCode = defaultLanguage === true ? 'nb' : yield select(appLanguageStateSelector);
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
    // The currently selected language in the profile is preset to 'nb' when this state is initialized, so we
    // cannot trust it until the profile is properly fetched (having a userId when not anonymous)
    yield waitFor((state) => state.profile.profile?.userId !== undefined);
  }

  yield call(fetchLanguageSaga);
  yield takeLatest(ProfileActions.updateSelectedAppLanguage, fetchLanguageSaga);
}
