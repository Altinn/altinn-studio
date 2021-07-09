import { SagaIterator } from 'redux-saga';
import { call, fork, put, takeLatest } from 'redux-saga/effects';
import { post } from 'app-shared/utils/networking';
import { PayloadAction } from '@reduxjs/toolkit';
import { appDeploymentsUrl } from '../../../utils/urlHelper';
import { ICreateAppDeployment } from '../types';
import { AppDeploymentActions } from '../appDeploymentSlice';

function* createAppDeploymentSaga(action: PayloadAction<ICreateAppDeployment>): SagaIterator {
  const { envObj, tagName } = action.payload;
  try {
    const data = {
      tagName,
      env: envObj,
    };

    const result = yield call(post, appDeploymentsUrl, data);

    yield put(AppDeploymentActions.createAppDeploymentFulfilled({ envName: envObj.name, result }));
  } catch (error) {
    yield put(AppDeploymentActions.createAppDeploymentRejected({ envName: envObj.name, error }));
  }
}

export function* watchCreateAppDeploymentSaga(): SagaIterator {
  yield takeLatest(AppDeploymentActions.createAppDeployment, createAppDeploymentSaga);
}

// eslint-disable-next-line func-names
export default function* (): SagaIterator {
  yield fork(watchCreateAppDeploymentSaga);
}
