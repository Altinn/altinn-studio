// import * as moment from 'moment';
import { SagaIterator } from 'redux-saga';
import { delay } from 'redux-saga/effects';
import { call, fork, race, take } from 'redux-saga/effects';
import { get } from 'app-shared/utils/networking';
import { getAppDeploymentsUrl } from '../../../utils/urlHelper';
import * as AppDeploymentActionTypes from '../appDeploymentActionTypes';
import AppDeploymentActionDispatcher from '../appDeploymentDispatcher';

// Worker function - polling
function* getAppDeploymentIntervalSaga(): SagaIterator {
  while (true) {
    try {
      const deployments = yield call(get, `${getAppDeploymentsUrl()}?sortDirection=descending&sortBy=created`);

      yield call(AppDeploymentActionDispatcher.getAppDeploymentsFulfilled, deployments);
      yield call(delay, 10000);
    } catch (err) {
      yield call(AppDeploymentActionDispatcher.getAppDeploymentsRejected, err);
      yield call(delay, 10000);
    }
  }
}

// Interval watcher function
function* watchGetAppDeploymentIntervalSaga(): SagaIterator {
  while (true) {
    yield take(AppDeploymentActionTypes.GET_APP_DEPLOYMENTS_START_INTERVAL);
    yield race({
      do: call(getAppDeploymentIntervalSaga),
      cancel: take(AppDeploymentActionTypes.GET_APP_DEPLOYMENTS_STOP_INTERVAL),
    });
  }
}

export default function*(): SagaIterator {
  yield fork(watchGetAppDeploymentIntervalSaga);
}
