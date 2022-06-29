import type { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import {
  watchFetchLanguageSaga,
  watchFetchDefaultLanguageSaga,
} from './fetch/fetchLanguageSagas';

export default function* languageSagas(): SagaIterator {
  yield fork(watchFetchLanguageSaga);
  yield fork(watchFetchDefaultLanguageSaga);
}
