import { SagaIterator } from 'redux-saga';
import { call, fork, takeLatest } from 'redux-saga/effects';
import { get } from '../../../../../shared/src/utils/networking';
import { urls } from '../../../config/sharedConfig';
import * as AppClusterActionTypes from '../appClusterActionTypes';
import AppClusterDispatcher from '../appClusterDispatcher';
import * as GetDeploymentsActions from './getDeploymentsInAppClusterActions';

// GET DEPLOYMENT
export function* getDeploymentsSaga({
  env,
  org,
  repo,
}: GetDeploymentsActions.IGetDeployments): SagaIterator {
  try {
    const result = yield call(get,
      // tslint:disable-next-line:max-line-length
      `https://${org}.apps.${env}.${urls.hostname.apps.test}/kuberneteswrapper/api/v1/deployments?labelSelector=release=${org}-${repo}`);
    console.log('yielded', result);
    yield call(AppClusterDispatcher.getDeploymentsFulfilled, result, env);
  } catch (err) {
    yield call(AppClusterDispatcher.getDeploymentsRejected, err, env);
  }
}

export function* watchGetDeploymentsSaga(): SagaIterator {
  yield takeLatest(
    AppClusterActionTypes.GET_DEPLOYMENTS,
    getDeploymentsSaga,
  );
}

// WATCHES EXPORT
export function* getDeploymentsInAppClusterSagas(): SagaIterator {
  yield fork(watchGetDeploymentsSaga);
  // Insert all watchSagas here
}
