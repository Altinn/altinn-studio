/* eslint-disable import/prefer-default-export */
/* eslint-disable no-restricted-syntax */
import { SagaIterator } from 'redux-saga';
import { call, fork, put, race, select, take, delay } from 'redux-saga/effects';
import { get } from 'app-shared/utils/networking';
import { getDeploymentsFulfilled, getDeploymentsRejected, getDeploymentsStartInterval, getDeploymentsStopInterval } from '../appClusterSlice';

const SelectEnvironments = (store: IServiceDevelopmentState) => store.configuration.environments.result;
const OrgsSelector = (store: IServiceDevelopmentState) => store.configuration.orgs.allOrgs;

function* getDeploymentsIntervalSaga(): SagaIterator {
  while (true) {
    const { org, app } = window as Window as IAltinnWindow;
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

function* fetchEnvironmentDeployments(org: string, app: string, env: any): SagaIterator {
  try {
    const result = yield call(get,
      // eslint-disable-next-line max-len
      `https://${org}.apps.${env.hostname}/kuberneteswrapper/api/v1/deployments?labelSelector=release=${org}-${app}`);

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
