// import * as moment from 'moment';
import { SagaIterator } from 'redux-saga';
import { delay } from 'redux-saga';
import { call, fork, race, take } from 'redux-saga/effects';
import { get } from '../../../../../shared/src/utils/networking';
import { getAppDeploymentsUrl } from '../../../utils/urlHelper';
import * as AppDeploymentActionTypes from '../appDeploymentActionTypes';
import AppDeploymentActionDispatcher from '../appDeploymentDispatcher';

// export const mockDeployments: IDeploymentResults = {
//   results: []
// };

// export const mockDeployments: IDeploymentResults = {
//   results: [
//     {
//       id: 'document_id',
//       tagName: '1.2.9',
//       app: 'deployment_1_app',
//       org: 'deployment_1_org',
//       envName: 'at21',
//       createdBy: 'All Deploys',
//       created: '2019-10-18T10:30:15.3464541+02:00',
//       build: {
//         id: '17232',
//         status: 5,
//         result: 'succeeded',
//         started: null,
//         finished: '2019-10-18T10:30:15.3464541+02:00',
//       },
//     },
//     {
//       id: 'document_id',
//       tagName: '1.2.8',
//       app: 'deployment_1_app',
//       org: 'deployment_1_org',
//       envName: 'at21',
//       createdBy: 'deployment_1_createdBy',
//       created: '2019-10-14T10:38:15.3464541+02:00',
//       build: {
//         id: '17232',
//         status: 5,
//         result: 'succeeded',
//         started: null,
//         finished: '2019-10-14T10:38:15.3464541+02:00',
//       },
//     },
//     {
//       id: 'document_id',
//       tagName: '1.2.7',
//       app: 'deployment_1_app',
//       org: 'deployment_1_org',
//       envName: 'at21',
//       createdBy: 'deployment_1_createdBy',
//       created: '2019-10-14T10:38:15.3464541+02:00',
//       build: {
//         id: '17232',
//         status: 5,
//         result: 'succeeded',
//         started: null,
//         finished: '2019-10-14T10:38:15.3464541+02:00',
//       },
//     },
//     {
//       id: 'document_id',
//       tagName: '1.2.6',
//       app: 'deployment_1_app',
//       org: 'deployment_1_org',
//       envName: 'at21',
//       createdBy: 'deployment_1_createdBy',
//       created: '2019-10-14T10:38:15.3464541+02:00',
//       build: {
//         id: '17232',
//         status: 5,
//         result: 'succeeded',
//         started: null,
//         finished: '2019-10-14T10:38:15.3464541+02:00',
//       },
//     },
//     {
//       id: 'document_id',
//       tagName: '1.2.4',
//       app: 'deployment_1_app',
//       org: 'deployment_1_org',
//       envName: 'at21',
//       createdBy: 'deployment_1_createdBy',
//       created: '2019-10-14T10:38:15.3464541+02:00',
//       build: {
//         id: '17232',
//         status: 5,
//         result: 'succeeded',
//         started: null,
//         finished: '2019-10-14T10:38:15.3464541+02:00',
//       },
//     },
//     {
//       id: 'document_id',
//       tagName: '1.2.3',
//       app: 'deployment_1_app',
//       org: 'deployment_1_org',
//       envName: 'at21',
//       createdBy: 'deployment_1_createdBy',
//       created: '2019-10-14T10:38:15.3464541+02:00',
//       build: {
//         id: '17232',
//         status: 5,
//         result: 'succeeded',
//         started: null,
//         finished: '2019-10-14T10:38:15.3464541+02:00',
//       },
//     },
//     {
//       id: 'document_id',
//       tagName: '1.2.2',
//       app: 'deployment_1_app',
//       org: 'deployment_1_org',
//       envName: 'at21',
//       createdBy: 'deployment_1_createdBy',
//       created: '2019-10-14T10:38:15.3464541+02:00',
//       build: {
//         id: '17232',
//         status: 5,
//         result: 'succeeded',
//         started: null,
//         finished: '2019-10-14T10:38:15.3464541+02:00',
//       },
//     },
//     {
//       id: 'document_id',
//       tagName: '1.2.1',
//       app: 'deployment_1_app',
//       org: 'deployment_1_org',
//       envName: 'at21',
//       createdBy: 'deployment_1_createdBy',
//       created: '2019-10-14T10:38:15.3464541+02:00',
//       build: {
//         id: '17232',
//         status: 5,
//         result: 'succeeded',
//         started: null,
//         finished: '2019-10-14T10:38:15.3464541+02:00',
//       },
//     },
//     {
//       id: 'document_id',
//       tagName: '1.2.0',
//       app: 'deployment_1_app',
//       org: 'deployment_1_org',
//       envName: 'at21',
//       createdBy: 'deployment_1_createdBy',
//       created: '2019-10-14T10:38:15.3464541+02:00',
//       build: {
//         id: '17232',
//         status: 5,
//         result: 'succeeded',
//         started: null,
//         finished: '2019-10-14T10:38:15.3464541+02:00',
//       },
//     },
//     {
//       id: 'document_id',
//       tagName: '1.1.6',
//       app: 'deployment_1_app',
//       org: 'deployment_1_org',
//       envName: 'at21',
//       createdBy: 'deployment_1_createdBy',
//       created: '2019-10-14T10:38:15.3464541+02:00',
//       build: {
//         id: '17232',
//         status: 5,
//         result: 'succeeded',
//         started: null,
//         finished: '2019-10-14T10:38:15.3464541+02:00',
//       },
//     },
//     {
//       id: 'document_id',
//       tagName: '1.1.5',
//       app: 'deployment_1_app',
//       org: 'deployment_1_org',
//       envName: 'at21',
//       createdBy: 'deployment_1_createdBy',
//       created: '2019-10-14T10:38:15.3464541+02:00',
//       build: {
//         id: '17232',
//         status: 5,
//         result: 'succeeded',
//         started: null,
//         finished: '2019-10-14T10:38:15.3464541+02:00',
//       },
//     },
//     {
//       id: 'document_id',
//       tagName: '1.1.4',
//       app: 'deployment_1_app',
//       org: 'deployment_1_org',
//       envName: 'tt',
//       createdBy: 'deployment_1_createdBy',
//       created: '2019-10-14T10:38:15.3464541+02:00',
//       build: {
//         id: '17232',
//         status: 5,
//         result: 'succeeded',
//         started: null,
//         finished: '2019-10-14T10:38:15.3464541+02:00',
//       },
//     },
//     {
//       id: 'document_id',
//       tagName: '1.1.1',
//       app: 'deployment_1_app',
//       org: 'deployment_1_org',
//       envName: 'tt',
//       createdBy: 'deployment_1_createdBy',
//       created: '2019-10-14T10:38:15.3464541+02:00',
//       build: {
//         id: '17232',
//         status: 5,
//         result: 'succeeded',
//         started: null,
//         finished: '2019-10-14T10:38:15.3464541+02:00',
//       },
//     },
//   ],
// };

// Worker function - polling
function* getAppDeploymentIntervalSaga(): SagaIterator {
  while (true) {
    try {

      // mockDeployments.results[0].created = moment().format();
      // mockDeployments.results[0].build.finished = moment().format();

      const deployments = yield call(get, `${getAppDeploymentsUrl()}?sortDirection=ascending&sortBy=created`);

      yield call(AppDeploymentActionDispatcher.getAppDeploymentsFulfilled, deployments);
      yield call(delay, 500000);
    } catch (err) {
      yield call(AppDeploymentActionDispatcher.getAppDeploymentsRejected, err);
      yield call(delay, 500000);
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
