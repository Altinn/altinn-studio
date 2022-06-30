import type { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import {
  waitForAppSetupBeforeRunningConditionalRulesSaga,
  watchCheckIfConditionalRulesShouldRunSaga,
} from './conditionalRendering/conditionalRenderingSagas';
import { watchFetchDynamics } from './fetch/fetchFormDynamicsSagas';

export default function* formDynamicsSagas(): SagaIterator {
  yield fork(watchCheckIfConditionalRulesShouldRunSaga);
  yield fork(waitForAppSetupBeforeRunningConditionalRulesSaga);
  yield fork(watchFetchDynamics);
}
