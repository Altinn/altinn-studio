import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import {
  watchAddApiConnectionSaga,
  watchDelApiConnectionSaga,
} from './apiSagas';

export default function*(): SagaIterator {
  yield fork(watchAddApiConnectionSaga);
  yield fork(watchDelApiConnectionSaga);
}
