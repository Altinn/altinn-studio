import { AxiosError } from 'axios';
import { delay, SagaIterator } from 'redux-saga';
import { call, fork, race, take, takeLatest } from 'redux-saga/effects';
import { checkIfAxiosError } from '../../../../../shared/src/utils/networking';
// import { get } from '../../../utils/networking';
// import { releasesUrlGet } from '../../../utils/urlHelper';
import * as AppReleaseActionTypes from './../appReleaseActionTypes';
import AppReleaseActionDispatcher from './../appReleaseDispatcher';
import { BuildResult, BuildStatus, IRelease } from './../types';

const mockReleases: IRelease[] = [
  {
    tagName: 'OHIAMDATAG7',
    name: 'DANAME',
    body: 'DADBOD',
    targetCommitish: '1e19c995b53445d7ffd8b3ed1eadec2f51d3b858',
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
    tagName: 'OHIAMDATAG6',
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
    tagName: 'OHIAMDATAG5',
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
    tagName: 'OHIAMDATAG4',
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
    tagName: 'OHIAMDATAG3',
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
    tagName: 'OHIAMDATAG2',
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
    tagName: 'OHIAMDATAG1',
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
    // const result: any = yield call(get, releasesUrlGet);
    const random: number = Math.floor(Math.random() * 10);
    if (random % 2 === 0) {
      const error: AxiosError = {
        isAxiosError: true,
        name: 'Error',
        message: 'Oh noes',
        config: null,
        stack: '',
        request: null,
        response: {
          data: null,
          status: 400,
          statusText: 'Oh noes',
          headers: null,
          config: null,
        },
      };
      throw error;
    }
    yield call(AppReleaseActionDispatcher.getAppReleasesFulfilled, mockReleases);
  } catch (err) {
    if (checkIfAxiosError(err)) {
      const {response: {status}} = err as AxiosError;
      yield call(AppReleaseActionDispatcher.getAppReleasesRejected, status);
    }
  }
}

export function* watchGetReleasesSaga(): SagaIterator {
  yield takeLatest(
    AppReleaseActionTypes.GET_APP_RELEASES,
    getReleasesSaga,
  );
}

function* getReleasesIntervalSaga(): SagaIterator {
  while (true) {
    try {
      yield call(getReleasesSaga);
      yield call(delay, 5000);
    } catch (err) {
      yield call(AppReleaseActionDispatcher.getAppReleasesRejected, 1);
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
