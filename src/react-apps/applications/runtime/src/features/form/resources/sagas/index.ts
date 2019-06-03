import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';

import { watchFetchFormResourceSaga } from './fetch';

export default function*(): SagaIterator {
  yield fork(watchFetchFormResourceSaga);
}
