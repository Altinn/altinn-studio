import { SagaIterator } from 'redux-saga';
import { call, delay, fork, put, race, select, take } from 'redux-saga/effects';
import { get } from 'app-shared/utils/networking';
import {
  getDeploymentsFulfilled,
  getDeploymentsRejected,
  getDeploymentsStartInterval,
  getDeploymentsStopInterval,
} from '../appClusterSlice';
import type { RootState } from 'store';
import { _useParamsClassCompHack } from 'app-shared/utils/_useParamsClassCompHack';

const SelectEnvironments = (store: RootState) =>
  store.configuration.environments.result;
const OrgsSelector = (store: RootState) => store.configuration.orgs.allOrgs;

function* getDeploymentsIntervalSaga(): SagaIterator {
  while (true) {
    const { org, app } = _useParamsClassCompHack();
    const environments: any = yield select(SelectEnvironments);
    const orgs: any = yield select(OrgsSelector);

    for (const env of environments) {
      if (orgs && orgs[org]?.environments?.includes(env.name)) {
        yield fork(fetchEnvironmentDeployments, org, app, env);
      }
    }
    yield delay(30000);
  }
}

function* fetchEnvironmentDeployments(
  org: string,
  app: string,
  env: any,
): SagaIterator {
  try {
    const result = yield call(
      get,
      `https://${org}.apps.${env.hostname}/kuberneteswrapper/api/v1/deployments?labelSelector=release=${org}-${app}`,
    );

    yield put(getDeploymentsFulfilled({ result, env: env.name }));
  } catch (error) {
    yield put(getDeploymentsRejected({ error, env: env.name }));
  }
}

// Interval watcher function
function* watchGetDeploymentsIntervalSaga(): SagaIterator {
  while (true) {
    yield take(getDeploymentsStartInterval);
    yield race({
      do: call(getDeploymentsIntervalSaga),
      cancel: take(getDeploymentsStopInterval),
    });
  }
}

// WATCHES EXPORT
export function* getDeploymentsInAppClusterSagas(): SagaIterator {
  yield fork(watchGetDeploymentsIntervalSaga);
  // Insert all watchSagas here
}
