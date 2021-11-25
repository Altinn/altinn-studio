import { SagaIterator } from 'redux-saga';
import { call, fork, put, takeLatest } from 'redux-saga/effects';
import { get } from 'app-shared/utils/networking';
import { PayloadAction } from '@reduxjs/toolkit';
import { IRepoStatusAction, RepoStatusActions } from '../repoStatusSlice';

// GET MASTER REPO
export function* getMasterRepoStatusSaga({ payload: {
  org,
  repo,
} }: PayloadAction<IRepoStatusAction>): SagaIterator {
  try {
    const result = yield call(get,
      `/designer/api/v1/repos/${org}/${repo}/branches/branch&branch=master`);

    yield put(RepoStatusActions.getMasterRepoStatusFulfilled({ result }));
  } catch (error) {
    yield put(RepoStatusActions.getMasterRepoStatusRejected({ error }));
  }
}

export function* watchGetMasterRepoStatusSaga(): SagaIterator {
  yield takeLatest(RepoStatusActions.getMasterRepoStatus, getMasterRepoStatusSaga);
}

// WATCHES EXPORT
export function* repoStatusSagas(): SagaIterator {
  yield fork(watchGetMasterRepoStatusSaga);
  // Insert all watchSagas here
}
