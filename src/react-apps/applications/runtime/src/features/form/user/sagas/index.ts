import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';

import { watchFetchFormUserSaga } from './fetch';

export default function*(): SagaIterator {
  yield fork(watchFetchFormUserSaga);
}
