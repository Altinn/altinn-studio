import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchGetApplicationMetadataSaga } from './get/getAppMetadataSagas';
import { watchPutApplicationMetadataSaga } from './put/putAppMetadataSagas';

export function* applicationMetadataSagas(): SagaIterator {
  yield fork(watchGetApplicationMetadataSaga);
  yield fork(watchPutApplicationMetadataSaga);
}
