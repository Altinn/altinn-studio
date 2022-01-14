import { SagaIterator } from 'redux-saga';
import { delay, call, fork, put, race, take } from 'redux-saga/effects';
import { get } from 'app-shared/utils/networking';
import { appDeploymentsUrl } from '../../../utils/urlHelper';
import { AppDeploymentActions } from '../appDeploymentSlice';

// Worker function - polling
function* getAppDeploymentIntervalSaga(): SagaIterator {
  while (true) {
    try {
      const deployments = yield call(get, `${appDeploymentsUrl}?sortDirection=descending`);

      yield put(AppDeploymentActions.getAppDeploymentsFulfilled({ deployments }));
      yield delay(10000);
    } catch (error) {
      yield put(AppDeploymentActions.getAppDeploymentsRejected({ error }));
      yield delay(10000);
    }
  }
}

// Interval watcher function
function* watchGetAppDeploymentIntervalSaga(): SagaIterator {
  while (true) {
    yield take(AppDeploymentActions.getAppDeploymentsStartInterval);
    yield race({
      do: call(getAppDeploymentIntervalSaga),
      cancel: take(AppDeploymentActions.getAppDeploymentsStopInterval),
    });
  }
}

// eslint-disable-next-line func-names
export default function* (): SagaIterator {
  yield fork(watchGetAppDeploymentIntervalSaga);
}
