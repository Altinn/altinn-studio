import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchCheckIfApiShouldFetchSaga } from './api';
import { watchCheckIfConditionalRulesShouldRunSaga } from './conditionalRendering';

export default function*(): SagaIterator {
  yield fork(watchCheckIfApiShouldFetchSaga);
  yield fork(watchCheckIfConditionalRulesShouldRunSaga);
}