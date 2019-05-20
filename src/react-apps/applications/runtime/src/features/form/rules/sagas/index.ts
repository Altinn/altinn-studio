import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';

import { watchFetchRuleModelSaga } from './fetch';
import { watchCheckIfRuleShouldRunSaga } from './rule';

export default function*(): SagaIterator {
  yield fork(watchCheckIfRuleShouldRunSaga);
  yield fork(watchFetchRuleModelSaga);
}
