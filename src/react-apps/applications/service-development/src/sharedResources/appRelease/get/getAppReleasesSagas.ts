import { SagaIterator } from 'redux-saga';
import { call, fork, takeLatest } from 'redux-saga/effects';
import * as AppReleaseActionTypes from './../appReleaseActionTypes';
import AppReleaseActionDispatcher from './../appReleaseDispatcher';
import { BuildStatus, IRelease } from './../types';

const mockReleases: IRelease[] = [
  {
    tagName: '1.2.3',
    name: 'nystruktur',
    body: 'nybod',
    targetCommitish: '58cad2ceb1',
    build: {
        id: '17006',
        status: BuildStatus.completed,
        started: '2019-11-14T12:15:32.619Z',
        finished: '2019-12-14T12:15:32.619Z',
    },
    id: 'c09bad29-4ae7-410e-b54a-8b0dfc2ff2f4',
    created: '2019-10-14T10:38:15.3464541+02:00',
    createdBy: null,
    app: 'automatedtest',
    org: 'tdd',
  },
  {
    tagName: '1.2.1',
    name: 'nystruktur',
    body: 'nybod',
    targetCommitish: '58cad2ceb1',
    build: {
        id: '17006',
        status: BuildStatus.completed,
        started: '2019-11-14T12:15:32.619Z',
        finished: '2019-12-14T12:15:32.619Z',
    },
    id: 'c09bad29-4ae7-410e-b54a-8b0dfc2ff2f4',
    created: '2019-10-14T10:38:15.3464541+02:00',
    createdBy: null,
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

export default function*(): SagaIterator {
  yield fork(watchGetReleasesSaga);
}
