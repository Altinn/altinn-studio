/* eslint-disable func-names */
import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchCheckIfOptionsShouldRefetchSaga, watchFetchOptionsSaga, watchInitialFetchOptionSaga } from './fetch/fetchOptionsSagas';

export default function* (): SagaIterator {
  yield fork(watchFetchOptionsSaga);
  yield fork(watchInitialFetchOptionSaga);
  yield fork(watchCheckIfOptionsShouldRefetchSaga);
}
