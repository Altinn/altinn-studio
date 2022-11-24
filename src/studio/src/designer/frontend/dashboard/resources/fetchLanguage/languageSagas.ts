import type { PayloadAction } from '@reduxjs/toolkit';
import type { SagaIterator } from 'redux-saga';
import { call, fork, put, takeLatest } from 'redux-saga/effects';
import { get } from 'app-shared/utils/networking';
import type { IFetchLanguageAction } from './languageSlice';
import { fetchLanguage, fetchLanguageFulfilled, fetchLanguageRejected } from './languageSlice';

export function* languageSaga({
  payload: { url },
}: PayloadAction<IFetchLanguageAction>): SagaIterator {
  try {
    const language = yield call(get, url, { params: {} });
    yield put(fetchLanguageFulfilled({ language }));
  } catch (error) {
    yield put(fetchLanguageRejected({ error }));
  }
}

export function* watchLanguageSaga(): SagaIterator {
  yield takeLatest(fetchLanguage, languageSaga);
}

export default function* (): SagaIterator {
  yield fork(watchLanguageSaga);
}
