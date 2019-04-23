import { SagaIterator } from 'redux-saga';
import { call, fork, takeLatest } from 'redux-saga/effects';
import { get, post } from '../../../../shared/src/utils/networking';
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
    // env = 'at22';
    const result = yield call(get,
      `http://${org}.apps.${env}.altinn.cloud/kuberneteswrapper/deployments?labelSelector=release=${org}-${repo}`);

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
      `/designerapi/Repository/Branch?owner=${org}&repository=${repo}&branch=master`);

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

    // const result = {
    //   success: true,
    //   message: 'Deployment status: 7222',
    //   buildId: '7222',
    // };

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

    // const inProgress = {
    //   "status": "inProgress",
    //   "startTime": "2019-04-11T17:26:12.3887035Z",
    //   "finishTime": null,
    //   "success": false,
    //   "message": "Deployment status: inProgress",
    //   "buildId": "7236",
    // };

    // const failed = {
    //   "status": "completed",
    //   "startTime": "2019-04-11T17:44:31.8583703Z",
    //   "finishTime": "2019-04-11T17:44:53.4667641Z",
    //   "success": false,
    //   "message": "Deployment status: completed",
    //   "buildId": "7237"
    // };

    // const result = {
    //   status: 'completed',
    //   startTime: '2019-04-11T12:52:10.2722025Z',
    //   finishTime: '2019-04-11T12:52:34.7263946Z',
    //   success: true,
    //   message: 'Deployment status: completed',
    //   buildId: '7222',
    // };

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

// WATCHES EXPORT
export function* deploySagas(): SagaIterator {
  yield fork(watchFetchDeploymentsSaga);
  yield fork(watchFetchMasterRepoStatusSaga);
  yield fork(watchDeployAltinnAppSaga);
  yield fork(watchFetchDeployAltinnAppStatusSaga);
  // Insert all watchSagas here
}
