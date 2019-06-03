import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';

import { watchFetchFormLayoutSaga } from './fetch';

export default function*(): SagaIterator {
  yield fork(watchFetchFormLayoutSaga);
}
