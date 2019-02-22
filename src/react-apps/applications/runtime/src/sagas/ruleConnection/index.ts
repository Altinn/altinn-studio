import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import {
  watchAddRuleConnectionSaga,
  watchCheckIfRuleShouldRunSaga,
  watchDelRuleConnectionSaga,
} from './ruleConnectionSagas';

export default function*(): SagaIterator {
  yield fork(watchAddRuleConnectionSaga);
  yield fork(watchDelRuleConnectionSaga);
  yield fork(watchCheckIfRuleShouldRunSaga);
}
