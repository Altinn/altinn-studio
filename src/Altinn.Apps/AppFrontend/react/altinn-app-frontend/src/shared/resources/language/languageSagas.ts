import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchFetchLanguageSaga } from './fetch/fetchLanguageSagas';

export default function* languageSagas(): SagaIterator {
  yield fork(watchFetchLanguageSaga);
}
