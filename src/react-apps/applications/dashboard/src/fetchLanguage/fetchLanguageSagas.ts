import { SagaIterator } from 'redux-saga';
import { call, takeLatest, fork } from 'redux-saga/effects';
import { get } from '../../../shared/src/utils/networking';
import * as FetchLanguageActions from './fetchLanguageActions';
import * as FetchLanguageActionTypes from './fetchLanguageActionTypes';
import FetchLanguageDispatchers from './fetchLanguageDispatcher';

export function* fetchLanguageSaga({
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

export function* watchFetchLanguageSaga(): SagaIterator {
  yield takeLatest(
    FetchLanguageActionTypes.FETCH_LANGUAGE,
    fetchLanguageSaga,
  );
}

export default function* (): SagaIterator {
  yield fork(watchFetchLanguageSaga);
}
