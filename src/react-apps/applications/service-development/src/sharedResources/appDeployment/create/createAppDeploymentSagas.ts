import { SagaIterator } from 'redux-saga';
import { call, fork, takeLatest } from 'redux-saga/effects';
import * as AppDeploymentActionTypes from '../appDeploymentActionTypes';
import AppDeploymentActionDispatcher from '../appDeploymentDispatcher';

function* createAppDeploymentSaga(): SagaIterator {
  try {
    yield call(AppDeploymentActionDispatcher.createDeploymentFulfilled, 'release-id');
  } catch (err) {
    yield call(AppDeploymentActionDispatcher.createDeploymentRejected, err);
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
