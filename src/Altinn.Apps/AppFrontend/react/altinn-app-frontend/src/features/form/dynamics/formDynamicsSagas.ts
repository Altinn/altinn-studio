import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchCheckIfApiShouldFetchSaga } from './api/apiSagas';
import { waitForAppSetupBeforeRunningConditionalRulesSaga, watchCheckIfConditionalRulesShouldRunSaga } from './conditionalRendering/conditionalRenderingSagas';
import { watchFetchDynamics } from './fetch/fetchFormDynamicsSagas';

export default function*(): SagaIterator {
  yield fork(watchCheckIfApiShouldFetchSaga);
  yield fork(watchCheckIfConditionalRulesShouldRunSaga);
  yield fork(waitForAppSetupBeforeRunningConditionalRulesSaga);
  yield fork(watchFetchDynamics);
}
