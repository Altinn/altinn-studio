/* eslint-disable func-names */
import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchFetchOptionsSaga } from './fetch/fetchOptionsSagas';

export default function* (): SagaIterator {
  yield fork(watchFetchOptionsSaga);
}
