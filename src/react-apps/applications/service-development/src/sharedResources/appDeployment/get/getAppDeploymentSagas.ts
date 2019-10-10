import { SagaIterator } from 'redux-saga';
import { call, fork, takeLatest } from 'redux-saga/effects';
import * as AppDeploymentActionTypes from '../appDeploymentActionTypes';
import AppDeploymentActionDispatcher from '../appDeploymentDispatcher';
import { IDeployment } from '../types';

const mockDeployments: IDeployment[] = [
  {
    id: 'deployment_1_id',
    tag_name: 'deployment_1_tag_name',
    app: 'deployment_1_app',
    org: 'deployment_1_org',
    env_name: 'deployment_1_env_name',
    created_by: 'deployment_1_created_by',
    created: 'deployment_1_created',
    status: 'deployment_1_status',
    started: 'deployment_1_started',
    finished: 'deployment_1_finished',
    build: {
      id: 'deployment_1_build_id',
    },
  },
  {
    id: 'deployment_2_id',
    tag_name: 'deployment_2_tag_name',
    app: 'deployment_2_app',
    org: 'deployment_2_org',
    env_name: 'deployment_2_env_name',
    created_by: 'deployment_2_created_by',
    created: 'deployment_2_created',
    status: 'deployment_2_status',
    started: 'deployment_2_started',
    finished: 'deployment_2_finished',
    build: {
      id: 'deployment_2_build_id',
    },
  },
]

function* getAppDeploymentSaga(): SagaIterator {
  try {
    yield call(AppDeploymentActionDispatcher.getAppDeploymentsFulfilled, mockDeployments);
  } catch (err) {
    yield call(AppDeploymentActionDispatcher.getAppDeploymentsRejected, err);
  }
}

export function* watchGetAppDeploymentSaga(): SagaIterator {
  yield takeLatest(
    AppDeploymentActionTypes.GET_APP_DEPLOYMENTS,
    getAppDeploymentSaga,
  );
}

export default function*(): SagaIterator {
  yield fork(watchGetAppDeploymentSaga);
}
