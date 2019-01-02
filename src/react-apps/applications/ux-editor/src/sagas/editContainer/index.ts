import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import {
  watchDeleteActiveListSaga,
  watchUpdateActiveListSaga,
  watchUpdateActiveOrderSaga,
} from './editContainerSagas';

export default function* (): SagaIterator {
  yield fork(watchUpdateActiveListSaga);
  yield fork(watchUpdateActiveOrderSaga);
  yield fork(watchDeleteActiveListSaga);
}
