import { SagaIterator } from 'redux-saga';
import { call, fork, takeLatest } from 'redux-saga/effects';
import * as AppDeploymentActionTypes from '../appDeploymentActionTypes';
import AppDeploymentActionDispatcher from '../appDeploymentDispatcher';
import { IDeployment } from '../types';

const mockStartDeploymentResult: IDeployment = {
  id: 'document_id',
  tagName: '1.5.0',
  app: 'deployment_1_app',
  org: 'deployment_1_org',
  envName: 'at21',
  createdBy: 'Per Nilsen',
  created: '2019-10-18T10:38:15.3464541+02:00',
  build: {
    id: '17232',
    status: 5,
    result: 0,
    started: null,
    finished: null,
  },
};

function* createAppDeploymentSaga(): SagaIterator {
  try {
    yield call(AppDeploymentActionDispatcher.createAppDeploymentFulfilled, mockStartDeploymentResult);
  } catch (err) {
    yield call(AppDeploymentActionDispatcher.createAppDeploymentRejected, err);
  }
}

export function* watchCreateAppDeploymentSaga(): SagaIterator {
  yield takeLatest(
    AppDeploymentActionTypes.CREATE_APP_DEPLOYMENT,
    createAppDeploymentSaga,
  );
}

export default function*(): SagaIterator {
  yield fork(watchCreateAppDeploymentSaga);
}
