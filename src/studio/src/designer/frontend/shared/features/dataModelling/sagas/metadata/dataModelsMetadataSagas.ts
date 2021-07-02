import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchGetDataModelsMetadataSaga } from './get/getDataModelsMetadataSagas';

export function* dataModelsMetadataSagas(): SagaIterator {
  yield fork(watchGetDataModelsMetadataSaga);
}
