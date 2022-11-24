import type { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { getDeploymentsInAppClusterSagas } from './getDeployments/getDeploymentsInAppClusterSagas';

export function* appClusterSagas(): SagaIterator {
  yield fork(getDeploymentsInAppClusterSagas);
}
