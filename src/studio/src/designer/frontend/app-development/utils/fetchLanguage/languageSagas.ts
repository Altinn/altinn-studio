import { SagaIterator } from 'redux-saga';
import { call, fork, put, takeLatest } from 'redux-saga/effects';
import { get } from 'app-shared/utils/networking';
import { PayloadAction } from '@reduxjs/toolkit';
import { fetchLanguage, fetchLanguageFulfilled, fetchLanguageRejected, IFetchLanguageAction } from './languageSlice';

export function* languageSaga({ payload: {
  url,
  languageCode,
} }: PayloadAction<IFetchLanguageAction>): SagaIterator {
  try {
    const language = yield call(get, url, { params: { languageCode } });
    yield put(fetchLanguageFulfilled({ language }));
  } catch (error) {
    yield put(fetchLanguageRejected({ error }));
  }
}

export function* watchLanguageSaga(): SagaIterator {
  yield takeLatest(fetchLanguage, languageSaga);
}

// eslint-disable-next-line func-names
export default function* (): SagaIterator {
  yield fork(watchLanguageSaga);
}
