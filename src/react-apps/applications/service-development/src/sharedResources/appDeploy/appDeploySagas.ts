import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchCreateDeploymentSaga } from './create/createAppDeploymentSagas';
import { watchGetDeploymentSaga } from './get/getAppDeploymentSagas';

export function* appDeploymentSagas(): SagaIterator {
  yield fork(watchCreateDeploymentSaga);
  yield fork(watchGetDeploymentSaga);
}
