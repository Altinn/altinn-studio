import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchDeleteActiveListSaga, watchUpdateActiveListSaga, watchUpdateActiveOrderSaga } from './editActiveListSagas';

// eslint-disable-next-line func-names
export default function* (): SagaIterator {
  yield fork(watchDeleteActiveListSaga);
  yield fork(watchUpdateActiveListSaga);
  yield fork(watchUpdateActiveOrderSaga);
}
