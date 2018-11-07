import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import {
  watchAddConditionalRenderingSaga,
  watchCheckIfConditionalRulesShouldRun,
  watchDelConditionalRenderingSaga,
  watchForFulfillmentBeforeRunningRuleMethodsSaga,
} from './conditionalRenderingSagas';

export default function*(): SagaIterator {
  yield fork(watchAddConditionalRenderingSaga);
  yield fork(watchDelConditionalRenderingSaga);
  yield fork(watchCheckIfConditionalRulesShouldRun);
  yield fork(watchForFulfillmentBeforeRunningRuleMethodsSaga);
}
