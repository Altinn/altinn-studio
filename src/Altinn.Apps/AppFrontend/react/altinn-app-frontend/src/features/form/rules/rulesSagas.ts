import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';

import { watchFetchRuleModelSaga } from './fetch/fetchRulesSagas';
import { watchCheckIfRuleShouldRunSaga } from './check/checkRulesSagas';

export default function* rulesSagas(): SagaIterator {
  yield fork(watchCheckIfRuleShouldRunSaga);
  yield fork(watchFetchRuleModelSaga);
}
