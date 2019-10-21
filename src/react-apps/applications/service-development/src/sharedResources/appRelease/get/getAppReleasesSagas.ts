import { SagaIterator, delay } from 'redux-saga';
import { call, fork, race, take, takeLatest } from 'redux-saga/effects';
import * as AppReleaseActionTypes from './../appReleaseActionTypes';
import AppReleaseActionDispatcher from './../appReleaseDispatcher';
import { BuildResult, BuildStatus, IRelease } from './../types';

const mockReleases: IRelease[] = [
  {
    tagName: 'OHIAMDATAG',
    name: 'DANAME',
    body: 'DADBOD',
    targetCommitish: 'fbab640273facf630dc771e40b3f34414c471335',
    build: {
      id: '17165',
      status: BuildStatus.completed,
      result: BuildResult.succeeded,
      started: null,
      finished: null,
    },
    id: '55e66c34-fd4a-442e-9a82-e6a3e7b45315',
    created: '2019-10-15T12:45:24.9264303+02:00',
    createdBy: 'danrj',
    app: 'automatedtest',
    org: 'tdd',
  },
  {
    tagName: 'OHIAMDATAG',
    name: 'DANAME',
    body: 'DADBOD',
    targetCommitish: 'LOOKATMEIMTHECAPTAINNOW',
    build: {
      id: '17165',
      status: BuildStatus.completed,
      result: BuildResult.failed,
      started: null,
      finished: null,
    },
    id: '55e66c34-fd4a-442e-9a82-e6a3e7b45315',
    created: '2019-10-15T12:45:24.9264303+02:00',
    createdBy: 'danrj',
    app: 'automatedtest',
    org: 'tdd',
  },
  {
    tagName: 'OHIAMDATAG',
    name: 'DANAME',
    body: 'DADBOD',
    targetCommitish: 'LOOKATMEIMTHECAPTAINNOW',
    build: {
      id: '17165',
      status: BuildStatus.completed,
      result: BuildResult.succeeded,
      started: null,
      finished: null,
    },
    id: '55e66c34-fd4a-442e-9a82-e6a3e7b45315',
    created: '2019-10-15T12:45:24.9264303+02:00',
    createdBy: 'danrj',
    app: 'automatedtest',
    org: 'tdd',
  },
  {
    tagName: 'OHIAMDATAG',
    name: 'DANAME',
    body: 'DADBOD',
    targetCommitish: 'LOOKATMEIMTHECAPTAINNOW',
    build: {
      id: '17165',
      status: BuildStatus.completed,
      result: BuildResult.failed,
      started: null,
      finished: null,
    },
    id: '55e66c34-fd4a-442e-9a82-e6a3e7b45315',
    created: '2019-10-15T12:45:24.9264303+02:00',
    createdBy: 'danrj',
    app: 'automatedtest',
    org: 'tdd',
  },
  {
    tagName: 'OHIAMDATAG',
    name: 'DANAME',
    body: 'DADBOD',
    targetCommitish: 'LOOKATMEIMTHECAPTAINNOW',
    build: {
      id: '17165',
      status: BuildStatus.completed,
      result: BuildResult.succeeded,
      started: null,
      finished: null,
    },
    id: '55e66c34-fd4a-442e-9a82-e6a3e7b45315',
    created: '2019-10-15T12:45:24.9264303+02:00',
    createdBy: 'danrj',
    app: 'automatedtest',
    org: 'tdd',
  },
  {
    tagName: 'OHIAMDATAG',
    name: 'DANAME',
    body: 'DADBOD',
    targetCommitish: 'LOOKATMEIMTHECAPTAINNOW',
    build: {
      id: '17165',
      status: BuildStatus.completed,
      result: BuildResult.failed,
      started: null,
      finished: null,
    },
    id: '55e66c34-fd4a-442e-9a82-e6a3e7b45315',
    created: '2019-10-15T12:45:24.9264303+02:00',
    createdBy: 'danrj',
    app: 'automatedtest',
    org: 'tdd',
  },
  {
    tagName: 'OHIAMDATAG',
    name: 'DANAME',
    body: 'DADBOD',
    targetCommitish: 'LOOKATMEIMTHECAPTAINNOW',
    build: {
      id: '17165',
      status: BuildStatus.completed,
      result: BuildResult.succeeded,
      started: null,
      finished: null,
    },
    id: '55e66c34-fd4a-442e-9a82-e6a3e7b45315',
    created: '2019-10-15T12:45:24.9264303+02:00',
    createdBy: 'danrj',
    app: 'automatedtest',
    org: 'tdd',
  },
];

function* getReleasesSaga(): SagaIterator {
  try {
    yield call(AppReleaseActionDispatcher.getAppReleasesFulfilled, mockReleases);
  } catch (err) {
    yield call(AppReleaseActionDispatcher.getAppReleasesRejected, err);
  }
}

export function* watchGetReleasesSaga(): SagaIterator {
  yield takeLatest(
    AppReleaseActionTypes.GET_APP_RELEASES,
    getReleasesSaga,
  );
}

function* getReleasesIntervalSaga(): SagaIterator {
  while(true) {
    try {
      yield call(getReleasesSaga);
      yield call(delay, 5000);
    } catch (err) {
      yield call(AppReleaseActionDispatcher.getAppReleasesRejected, err);
    }
  }
}

function* watchGetReleasesIntervalSaga(): SagaIterator {
  while (true) {
    yield take(AppReleaseActionTypes.GET_APP_RELEASES_START_INTERVAL);
    yield race({
      do: call(getReleasesIntervalSaga),
      cancel: take(AppReleaseActionTypes.GET_APP_RELEASES_STOP_INTERVAL),
    });
  }
}

export default function*(): SagaIterator {
  yield fork(watchGetReleasesSaga);
  yield fork(watchGetReleasesIntervalSaga);
}
