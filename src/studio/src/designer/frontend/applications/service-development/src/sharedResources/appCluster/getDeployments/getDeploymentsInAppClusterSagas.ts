import { SagaIterator } from 'redux-saga';
import { delay } from 'redux-saga';
import { call, fork, race, select, take } from 'redux-saga/effects';
import { get } from '../../../../../shared/src/utils/networking';
import * as AppClusterActionTypes from '../appClusterActionTypes';
import AppClusterDispatcher from '../appClusterDispatcher';

const SelectEnvironments = (store: IServiceDevelopmentState) => store.configuration.environments.result;

function* getDeploymentsIntervalSaga(): SagaIterator {
  while (true) {
    const { org, app } = window as Window as IAltinnWindow;
    const environments: any = yield select(SelectEnvironments);

    for (const env of environments) {
      try {
        const result = yield call(get,
          // tslint:disable-next-line:max-line-length
          `https://${org}.apps.${env.hostname}/kuberneteswrapper/api/v1/deployments?labelSelector=release=${org}-${app}`);

        yield call(AppClusterDispatcher.getDeploymentsFulfilled, result, env.name);
      } catch (err) {
        yield call(AppClusterDispatcher.getDeploymentsRejected, err, env.name);
      }
    }
    yield call(delay, 30000);
  }
}

// Interval watcher function
function* watchGetDeploymentsIntervalSaga(): SagaIterator {
  while (true) {
    yield take(AppClusterActionTypes.GET_DEPLOYMENTS_START_INTERVAL);
    yield race({
      do: call(getDeploymentsIntervalSaga),
      cancel: take(AppClusterActionTypes.GET_DEPLOYMENTS_STOP_INTERVAL),
    });
  }
}

// WATCHES EXPORT
export function* getDeploymentsInAppClusterSagas(): SagaIterator {
  yield fork(watchGetDeploymentsIntervalSaga);
  // Insert all watchSagas here
}
