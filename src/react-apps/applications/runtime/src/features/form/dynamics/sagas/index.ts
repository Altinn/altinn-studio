import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchCheckIfApiShouldFetchSaga } from './api';
import { waitForAppSetupBeforeRunningConditionalRulesSaga, watchCheckIfConditionalRulesShouldRunSaga } from './conditionalRendering';
import { watchFetchDynamics } from './fetch';

export default function*(): SagaIterator {
  yield fork(watchCheckIfApiShouldFetchSaga);
  yield fork(watchCheckIfConditionalRulesShouldRunSaga);
  yield fork(waitForAppSetupBeforeRunningConditionalRulesSaga);
  yield fork(watchFetchDynamics);
}
