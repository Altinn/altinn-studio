import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import {
  watchAddApiConnectionSaga,
  watchCheckIfApisShouldFetchSaga,
  watchDelApiConnectionSaga,
  watchFetchApiListResponseSaga,
} from './apiSagas';

export default function*(): SagaIterator {
  yield fork(watchAddApiConnectionSaga);
  yield fork(watchDelApiConnectionSaga);
  yield fork(watchCheckIfApisShouldFetchSaga);
  yield fork(watchFetchApiListResponseSaga);
}
