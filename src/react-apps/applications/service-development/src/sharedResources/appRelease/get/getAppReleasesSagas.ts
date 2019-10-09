import { SagaIterator } from 'redux-saga';
import { call, fork, takeLatest } from 'redux-saga/effects';
import * as AppReleaseActionTypes from './../appReleaseActionTypes';
import AppReleaseActionDispatcher from './../appReleaseDispatcher';
import { BuildStatus, IRelease } from './../types';

const mockReleases: IRelease[] = [
  {
    id: 'release_1_id',
    tag_name: 'release_1_tag_name',
    name: 'release_1_name',
    body: 'release_1_body',
    app: 'release_1_app',
    org: 'release_1_org',
    env_name: 'release_1_env_name',
    target_commitish: 'release_1_target_commitish',
    created_by: 'release_1_created_by',
    created: 'release_1_created',
    build: {
      id: 'release_1_build_id',
      status: BuildStatus.completed,
      started: 'release_1_build_started',
      finished: 'release_1_build_finished',
    },
  },
  {
    id: 'release_2_id',
    tag_name: 'release_2_tag_name',
    name: 'release_2_name',
    body: 'release_2_body',
    app: 'release_2_app',
    org: 'release_2_org',
    env_name: 'release_2_env_name',
    target_commitish: 'release_2_target_commitish',
    created_by: 'release_2_created_by',
    created: 'release_2_created',
    build: {
      id: 'release_2_build_id',
      status: BuildStatus.inProgress,
      started: 'release_2_build_started',
      finished: 'release_2_build_finished',
    },
  },
];

function* getReleasesSaga(): SagaIterator {
  try {
    yield call(AppReleaseActionDispatcher.getReleasesFulfilled, mockReleases);
  } catch (err) {
    yield call(AppReleaseActionDispatcher.getReleasesRejected, err);
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
