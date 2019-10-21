import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchGetDeploymentsSaga } from './getDeployments/getDeploymentsInAppClusterSagas';

export function* appClusterSagas(): SagaIterator {
  yield fork(watchGetDeploymentsSaga);
}
