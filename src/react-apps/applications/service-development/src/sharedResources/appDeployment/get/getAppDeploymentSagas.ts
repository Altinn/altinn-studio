import { SagaIterator } from 'redux-saga';
import {delay} from 'redux-saga';
import { call, fork, race, take, takeLatest } from 'redux-saga/effects';
import * as AppDeploymentActionTypes from '../appDeploymentActionTypes';
import AppDeploymentActionDispatcher from '../appDeploymentDispatcher';
import { IDeployment } from '../types';

import * as moment from 'moment';

export const mockDeployments: IDeployment[] = [
  {
    id: 'document_id',
    tagName: '1.2.9',
    app: 'deployment_1_app',
    org: 'deployment_1_org',
    envName: 'at21',
    createdBy: 'deployment_1_createdBy',
    created: '2019-10-18T10:30:15.3464541+02:00',
    build: {
      id: '17232',
      status: 5,
      result: 'succeeded',
      started: null,
      finished: '2019-10-18T10:30:15.3464541+02:00',
    },
  },
  {
    id: 'document_id',
    tagName: '1.2.8',
    app: 'deployment_1_app',
    org: 'deployment_1_org',
    envName: 'at21',
    createdBy: 'deployment_1_createdBy',
    created: '2019-10-14T10:38:15.3464541+02:00',
    build: {
      id: '17232',
      status: 5,
      result: 'succeeded',
      started: null,
      finished: '2019-10-14T10:38:15.3464541+02:00',
    },
  },
  {
    id: 'document_id',
    tagName: '1.2.7',
    app: 'deployment_1_app',
    org: 'deployment_1_org',
    envName: 'at21',
    createdBy: 'deployment_1_createdBy',
    created: '2019-10-14T10:38:15.3464541+02:00',
    build: {
      id: '17232',
      status: 5,
      result: 'succeeded',
      started: null,
      finished: '2019-10-14T10:38:15.3464541+02:00',
    },
  },
  {
    id: 'document_id',
    tagName: '1.2.6',
    app: 'deployment_1_app',
    org: 'deployment_1_org',
    envName: 'at21',
    createdBy: 'deployment_1_createdBy',
    created: '2019-10-14T10:38:15.3464541+02:00',
    build: {
      id: '17232',
      status: 5,
      result: 'succeeded',
      started: null,
      finished: '2019-10-14T10:38:15.3464541+02:00',
    },
  },
  {
    id: 'document_id',
    tagName: '1.2.4',
    app: 'deployment_1_app',
    org: 'deployment_1_org',
    envName: 'at21',
    createdBy: 'deployment_1_createdBy',
    created: '2019-10-14T10:38:15.3464541+02:00',
    build: {
      id: '17232',
      status: 5,
      result: 'succeeded',
      started: null,
      finished: '2019-10-14T10:38:15.3464541+02:00',
    },
  },
  {
    id: 'document_id',
    tagName: '1.2.3',
    app: 'deployment_1_app',
    org: 'deployment_1_org',
    envName: 'at21',
    createdBy: 'deployment_1_createdBy',
    created: '2019-10-14T10:38:15.3464541+02:00',
    build: {
      id: '17232',
      status: 5,
      result: 'succeeded',
      started: null,
      finished: '2019-10-14T10:38:15.3464541+02:00',
    },
  },
  {
    id: 'document_id',
    tagName: '1.2.2',
    app: 'deployment_1_app',
    org: 'deployment_1_org',
    envName: 'at21',
    createdBy: 'deployment_1_createdBy',
    created: '2019-10-14T10:38:15.3464541+02:00',
    build: {
      id: '17232',
      status: 5,
      result: 'succeeded',
      started: null,
      finished: '2019-10-14T10:38:15.3464541+02:00',
    },
  },
  {
    id: 'document_id',
    tagName: '1.2.1',
    app: 'deployment_1_app',
    org: 'deployment_1_org',
    envName: 'at21',
    createdBy: 'deployment_1_createdBy',
    created: '2019-10-14T10:38:15.3464541+02:00',
    build: {
      id: '17232',
      status: 5,
      result: 'succeeded',
      started: null,
      finished: '2019-10-14T10:38:15.3464541+02:00',
    },
  },
  {
    id: 'document_id',
    tagName: '1.2.0',
    app: 'deployment_1_app',
    org: 'deployment_1_org',
    envName: 'at21',
    createdBy: 'deployment_1_createdBy',
    created: '2019-10-14T10:38:15.3464541+02:00',
    build: {
      id: '17232',
      status: 5,
      result: 'succeeded',
      started: null,
      finished: '2019-10-14T10:38:15.3464541+02:00',
    },
  },
  {
    id: 'document_id',
    tagName: '1.1.6',
    app: 'deployment_1_app',
    org: 'deployment_1_org',
    envName: 'at21',
    createdBy: 'deployment_1_createdBy',
    created: '2019-10-14T10:38:15.3464541+02:00',
    build: {
      id: '17232',
      status: 5,
      result: 'succeeded',
      started: null,
      finished: '2019-10-14T10:38:15.3464541+02:00',
    },
  },
  {
    id: 'document_id',
    tagName: '1.1.5',
    app: 'deployment_1_app',
    org: 'deployment_1_org',
    envName: 'at21',
    createdBy: 'deployment_1_createdBy',
    created: '2019-10-14T10:38:15.3464541+02:00',
    build: {
      id: '17232',
      status: 5,
      result: 'succeeded',
      started: null,
      finished: '2019-10-14T10:38:15.3464541+02:00',
    },
  },
  {
    id: 'document_id',
    tagName: '1.1.4',
    app: 'deployment_1_app',
    org: 'deployment_1_org',
    envName: 'tt',
    createdBy: 'deployment_1_createdBy',
    created: '2019-10-14T10:38:15.3464541+02:00',
    build: {
      id: '17232',
      status: 5,
      result: 'succeeded',
      started: null,
      finished: '2019-10-14T10:38:15.3464541+02:00',
    },
  },
  {
    id: 'document_id',
    tagName: '1.1.1',
    app: 'deployment_1_app',
    org: 'deployment_1_org',
    envName: 'tt',
    createdBy: 'deployment_1_createdBy',
    created: '2019-10-14T10:38:15.3464541+02:00',
    build: {
      id: '17232',
      status: 5,
      result: 'succeeded',
      started: null,
      finished: '2019-10-14T10:38:15.3464541+02:00',
    },
  },
]

function* getAppDeploymentSaga(): SagaIterator {
  try {
    yield call(AppDeploymentActionDispatcher.getAppDeploymentsFulfilled, mockDeployments);
  } catch (err) {
    yield call(AppDeploymentActionDispatcher.getAppDeploymentsRejected, err);
  }
}

// Worker function - polling
function* getAppDeploymentIntervalSaga(): SagaIterator {
  console.log('getDeploymentInterval');
  while (true) {
    try {
      console.log('getDeploymentInterval trying');
      mockDeployments[0].created = moment().format();
      yield call(AppDeploymentActionDispatcher.getAppDeploymentsFulfilled, mockDeployments);
      yield call(delay, 5000);
    } catch (err) {
      yield call(AppDeploymentActionDispatcher.getAppDeploymentsRejected, err);
      yield call(AppDeploymentActionDispatcher.getAppDeploymentsStopInterval);
    }
  }
}

// Get app deployments watcher function
function* watchGetAppDeploymentSaga(): SagaIterator {
  yield takeLatest(
    AppDeploymentActionTypes.GET_APP_DEPLOYMENTS,
    getAppDeploymentSaga,
    );
  }

// Interval watcher function
function* watchGetAppDeploymentIntervalSaga(): SagaIterator {
  while (true) {
    yield take(AppDeploymentActionDispatcher.getAppDeploymentsStartInterval);
    yield race({
      do: call(getAppDeploymentIntervalSaga),
      cancel: take(AppDeploymentActionTypes.GET_APP_DEPLOYMENTS_STOP_INTERVAL),
    });
  }
}

export default function*(): SagaIterator {
  yield fork(watchGetAppDeploymentSaga);
  yield fork(watchGetAppDeploymentIntervalSaga);
}
