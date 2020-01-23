import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchGetApplicationMetadataSaga } from './get/getApplicationMetadataSagas';
import { watchPutApplicationMetadataSaga } from './put/putApplicationMetaDataSagas';

export function* applicationMetadataSagas(): SagaIterator {
  yield fork(watchGetApplicationMetadataSaga);
  yield fork(watchPutApplicationMetadataSaga);
}
