import { SagaIterator } from 'redux-saga';
import { call, fork, takeLatest } from 'redux-saga/effects';
import { post } from '../../../../../shared/src/utils/networking';
import { getAppDeploymentsUrl } from '../../../utils/urlHelper';
import * as AppDeploymentActionTypes from '../appDeploymentActionTypes';
import AppDeploymentActionDispatcher from '../appDeploymentDispatcher';
import * as CreateAppDeploymentActions from './createAppDeploymentActions';

function* createAppDeploymentSaga({
  tagName,
  envObj,
}: CreateAppDeploymentActions.ICreateAppDeployment): SagaIterator {
  try {
    // throw new Error('Network error');

    const data = {
      tagName,
      env: envObj,
    };

    const result = yield call(post, getAppDeploymentsUrl(), data);

    yield call(AppDeploymentActionDispatcher.createAppDeploymentFulfilled, result, envObj.name);
  } catch (err) {
    yield call(AppDeploymentActionDispatcher.createAppDeploymentRejected, err, envObj.name);
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
