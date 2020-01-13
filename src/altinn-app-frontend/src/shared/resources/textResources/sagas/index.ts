import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';

import { watchFetchTextResourcesSaga } from './fetch';

export default function*(): SagaIterator {
  yield fork(watchFetchTextResourcesSaga);
}
