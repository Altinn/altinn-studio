import { SagaIterator } from 'redux-saga';
import { call, fork, takeLatest } from 'redux-saga/effects';
import { get } from 'app-shared/utils/networking';
import * as FetchLanguageActions from './fetchLanguageActions';
import * as FetchLanguageActionTypes from './fetchLanguageActionTypes';
import FetchLanguageDispatchers from './fetchLanguageDispatcher';

export function* languageSaga({
  url,
  languageCode,
}: FetchLanguageActions.IFetchLanguageAction): SagaIterator {
  try {
    const language = yield call(get, url, { params: { languageCode } });
    yield call(FetchLanguageDispatchers.fetchLanguageFulfilled, language);
  } catch (err) {
    yield call(FetchLanguageDispatchers.fetchLanguageRejected, err);
  }
}

export function* watchLanguageSaga(): SagaIterator {
  yield takeLatest(
    FetchLanguageActionTypes.FETCH_LANGUAGE,
    languageSaga,
  );
}

// eslint-disable-next-line func-names
export default function* (): SagaIterator {
  yield fork(watchLanguageSaga);
}
