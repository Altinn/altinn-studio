import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchGetInstanceDataSaga } from './get/getInstanceDataSagas';

export default function*(): SagaIterator {
  yield fork(watchGetInstanceDataSaga);
}
