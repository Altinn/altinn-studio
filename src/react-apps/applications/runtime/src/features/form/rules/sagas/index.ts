import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';

import { watchCheckIfRuleShouldRunSaga } from './rule';

export default function*(): SagaIterator {
  yield fork(watchCheckIfRuleShouldRunSaga);
}