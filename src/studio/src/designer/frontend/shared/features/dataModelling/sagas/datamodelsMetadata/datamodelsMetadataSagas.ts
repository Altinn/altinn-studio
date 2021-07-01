import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchGetDatamodelsMetadataSaga } from './get/getDatamodelsMetadataSagas';

export function* datamodelsMetadataSagas(): SagaIterator {
  yield fork(watchGetDatamodelsMetadataSaga);
}
