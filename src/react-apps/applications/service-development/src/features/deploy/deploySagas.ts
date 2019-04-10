import { SagaIterator } from 'redux-saga';
import { call, fork, takeLatest } from 'redux-saga/effects';
import { get } from '../../../../shared/src/utils/networking';
import * as DeployActions from './deployActions';
import * as DeployActionTypes from './deployActionTypes';
import DeployDispatchers from './deployDispatcher';

// FETCHES

export function* fetchDeploymentsSaga({
  env,
  org,
  repo,
}: DeployActions.IFetchDeploymentsAction): SagaIterator {
  try {
    const result = yield call(get,
      `http://${org}.apps.${env}.altinn.cloud/kuberneteswrapper/deployments?labelSelector=release=${org}-${repo}`);

    yield call(DeployDispatchers.fetchDeploymentsFulfilled, result, env);
  } catch (err) {
    yield call(DeployDispatchers.fetchDeploymentsRejected, err, env);
  }
}

export function* fetchMasterRepoStatusSaga({
  org,
  repo,
}: DeployActions.IFetchMasterRepoStatusAction): SagaIterator {
  try {
    const result = yield call(get,
      `/designerapi/Repository/Branch?owner=${org}&repository=${repo}&branch=master`);

    yield call(DeployDispatchers.fetchMasterRepoStatusFulfilled, result);
  } catch (err) {
    yield call(DeployDispatchers.fetchMasterRepoStatusRejected, err);
  }
}

// WATCHES

export function* watchFetchDeploymentsSaga(): SagaIterator {
  yield takeLatest(
    DeployActionTypes.FETCH_DEPLOYMENTS,
    fetchDeploymentsSaga,
  );
}

export function* watchFetchMasterRepoStatusSaga(): SagaIterator {
  yield takeLatest(
    DeployActionTypes.FETCH_MASTER_REPO_STATUS,
    fetchMasterRepoStatusSaga,
  );
}

export function* deploySagas(): SagaIterator {
  yield fork(watchFetchDeploymentsSaga);
  yield fork(watchFetchMasterRepoStatusSaga);
  // Insert more watchSagas here
}
