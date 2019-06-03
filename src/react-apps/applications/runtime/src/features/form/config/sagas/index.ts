import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchFetchFormConfigSaga } from './fetch';

export default function*(): SagaIterator {
  yield fork(watchFetchFormConfigSaga);
}
