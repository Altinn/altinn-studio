import { all, call, put, select, take, takeLatest } from 'redux-saga/effects';
import type { SagaIterator } from 'redux-saga';

import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { appLanguageStateSelector } from 'src/selectors/appLanguageStateSelector';
import { makeGetAllowAnonymousSelector } from 'src/selectors/getAllowAnonymous';
import { ApplicationMetadataActions } from 'src/shared/resources/applicationMetadata/applicationMetadataSlice';
import { LanguageActions } from 'src/shared/resources/language/languageSlice';
import { QueueActions } from 'src/shared/resources/queue/queueSlice';
import { waitFor } from 'src/utils/sagas';

import { getLanguageFromCode } from 'altinn-shared/language';

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
    yield waitFor((state) => !!state.profile.profile);
  }

  yield call(fetchLanguageSaga);
  yield takeLatest(
    LanguageActions.updateSelectedAppLanguage,
    fetchLanguageSaga,
  );
}
