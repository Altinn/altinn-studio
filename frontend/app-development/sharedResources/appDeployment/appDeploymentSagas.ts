import type { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchCreateAppDeploymentSaga } from './create/createAppDeploymentSagas';
import watchGetAppDeploymentSaga from './get/getAppDeploymentSagas';

export function* appDeploymentSagas(): SagaIterator {
  yield fork(watchCreateAppDeploymentSaga);
  yield fork(watchGetAppDeploymentSaga);
}
