import { SagaIterator } from 'redux-saga';
import { call, fork, takeLatest } from 'redux-saga/effects';
import { get, post } from '../../../../shared/src/utils/networking';
import { urls } from '../../config/sharedConfig';
import * as DeployActions from './deployActions';
import * as DeployActionTypes from './deployActionTypes';
import DeployDispatchers from './deployDispatcher';

// FETCH DEPLOYMENT
export function* fetchDeploymentsSaga({
  env,
  org,
  repo,
}: DeployActions.IFetchDeployments): SagaIterator {
  try {
    const result = yield call(get,
      // tslint:disable-next-line:max-line-length
      `https://${org}.apps.${env}.${urls.hostname.apps.test}/kuberneteswrapper/api/v1/deployments?labelSelector=release=${org}-${repo}`);

    yield call(DeployDispatchers.fetchDeploymentsFulfilled, result, env);
  } catch (err) {
    yield call(DeployDispatchers.fetchDeploymentsRejected, err, env);
  }
}

export function* watchFetchDeploymentsSaga(): SagaIterator {
  yield takeLatest(
    DeployActionTypes.FETCH_DEPLOYMENTS,
    fetchDeploymentsSaga,
  );
}

// FETCH MASTER REPO
export function* fetchMasterRepoStatusSaga({
  org,
  repo,
}: DeployActions.IFetchMasterRepoStatus): SagaIterator {
  try {
    const result = yield call(get,
      `/designerapi/Repository/Branch?org=${org}&repository=${repo}&branch=master`);

    yield call(DeployDispatchers.fetchMasterRepoStatusFulfilled, result);
  } catch (err) {
    yield call(DeployDispatchers.fetchMasterRepoStatusRejected, err);
  }
}

export function* watchFetchMasterRepoStatusSaga(): SagaIterator {
  yield takeLatest(
    DeployActionTypes.FETCH_MASTER_REPO_STATUS,
    fetchMasterRepoStatusSaga,
  );
}

// DEPLOY ALTINN APP
export function* deployAltinnAppSaga({
  env,
  org,
  repo,
}: DeployActions.IDeployAltinnApp): SagaIterator {
  try {
    const result = yield call(post, `/designer/${org}/${repo}/Deploy/StartDeployment`);

    yield call(DeployDispatchers.deployAltinnAppFulfilled, result, env);
  } catch (err) {
    yield call(DeployDispatchers.deployAltinnAppRejected, err, env);
  }
}

export function* watchDeployAltinnAppSaga(): SagaIterator {
  yield takeLatest(
    DeployActionTypes.DEPLOY_ALTINN_APP,
    deployAltinnAppSaga,
  );
}

// FETCH DEPLOY ALTINN APP STATUS
export function* fetchDeployAltinnAppStatusSaga({
  env,
  org,
  repo,
  buildId,
}: DeployActions.IFetchDeployAltinnAppStatus): SagaIterator {
  try {
    const result = yield call(get, `/designer/${org}/${repo}/Deploy/FetchDeploymentStatus?buildid=${buildId}`);

    yield call(DeployDispatchers.fetchDeployAltinnAppStatusFulfilled, result, env);
  } catch (err) {
    yield call(DeployDispatchers.fetchDeployAltinnAppStatusRejected, err, env);
  }
}

export function* watchFetchDeployAltinnAppStatusSaga(): SagaIterator {
  yield takeLatest(
    DeployActionTypes.FETCH_DEPLOY_ALTINN_APP_STATUS,
    fetchDeployAltinnAppStatusSaga,
  );
}

// FETCH COMPILE STATUS
export function* fetchCompileStatusSaga({
  org,
  repo,
}: DeployActions.IFetchCompileStatus): SagaIterator {
  try {
    const result = yield call(post,
      `/designer/api/v1/compile?org=${org}&app=${repo}`);

    yield call(DeployDispatchers.fetchCompileStatusFulfilled, result);
  } catch (err) {
    yield call(DeployDispatchers.fetchCompileStatusRejected, err);
  }
}

export function* watchFetchCompileStatusSaga(): SagaIterator {
  yield takeLatest(
    DeployActionTypes.FETCH_COMPILE_STATUS,
    fetchCompileStatusSaga,
  );
}

// WATCHES EXPORT
export function* deploySagas(): SagaIterator {
  yield fork(watchFetchDeploymentsSaga);
  yield fork(watchFetchMasterRepoStatusSaga);
  yield fork(watchDeployAltinnAppSaga);
  yield fork(watchFetchDeployAltinnAppStatusSaga);
  yield fork(watchFetchCompileStatusSaga);
  // Insert all watchSagas here
}
