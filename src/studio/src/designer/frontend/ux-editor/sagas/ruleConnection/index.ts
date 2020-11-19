import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchAddRuleConnectionSaga, watchDelRuleConnectionSaga } from './ruleConnectionSagas';

// eslint-disable-next-line func-names
export default function* (): SagaIterator {
  yield fork(watchAddRuleConnectionSaga);
  yield fork(watchDelRuleConnectionSaga);
}
