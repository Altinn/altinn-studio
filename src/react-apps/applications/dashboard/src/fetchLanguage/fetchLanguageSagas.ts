import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';
import { get } from '../../../shared/src/utils/networking';
import * as FetchLanguageActionTypes from './fetchDataActionTypes';
import * as FetchLanguageActions from './fetchLanguageActions';
import FetchLanguageDispatchers from './fetchLanguageDispatcher';

export function* fetchLanguageSaga({
  url,
  languageCode,
}: FetchLanguageActions.IFetchLanguageAction): SagaIterator {
  try {
    const language = yield call(get, url, { params: { languageCode } });
    yield call(FetchLanguageDispatchers.fetchLanguageFulfilled, language);
  } catch (err) {
    yield call(FetchLanguageDispatchers.fetchLanguageRecjeted, err);
  }
}

export function* watchFetchLanguageSaga(): SagaIterator {
  yield takeLatest(
    FetchLanguageActionTypes.FETCH_LANGUAGE,
    fetchLanguageSaga,
  );
}
