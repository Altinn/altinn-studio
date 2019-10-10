import { SagaIterator } from 'redux-saga';
import { call, fork, takeLatest } from 'redux-saga/effects';
import * as AppDeploymentActionTypes from './../appDeployActionTypes';
import AppDeploymentActionDispatcher from './../appDeployDispatcher';

function* createDeploymentSaga(): SagaIterator {
  try {
    yield call(AppDeploymentActionDispatcher.createDeploymentFulfilled, 'release-id');
  } catch (err) {
    yield call(AppDeploymentActionDispatcher.createDeploymentRejected, err);
  }
}

export function* watchCreateDeploymentSaga(): SagaIterator {
  yield takeLatest(
    AppDeploymentActionTypes.CREATE_APP_DEPLOYMENT,
    createDeploymentSaga,
  );
}

export default function*(): SagaIterator {
  yield fork(watchCreateDeploymentSaga);
}
