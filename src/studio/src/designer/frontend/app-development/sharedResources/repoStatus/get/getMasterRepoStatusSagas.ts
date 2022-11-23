import { SagaIterator } from 'redux-saga';
import { call, put, takeLatest } from 'redux-saga/effects';
import { get } from 'app-shared/utils/networking';
import { PayloadAction } from '@reduxjs/toolkit';
import { RepoStatusActions } from '../repoStatusSlice';
import type { IRepoStatusAction } from '../repoStatusSlice';
import { masterRepoStatusPath } from 'app-shared/api-paths';

// GET MASTER REPO
export function* getMasterRepoStatusSaga({
  payload: { org, repo },
}: PayloadAction<IRepoStatusAction>): SagaIterator {
  try {
    const result = yield call(get, masterRepoStatusPath(org, repo));
    yield put(RepoStatusActions.getMasterRepoStatusFulfilled({ result }));
  } catch (error) {
    yield put(RepoStatusActions.getMasterRepoStatusRejected({ error }));
  }
}

export function* watchGetMasterRepoStatusSaga(): SagaIterator {
  yield takeLatest(
    RepoStatusActions.getMasterRepoStatus,
    getMasterRepoStatusSaga,
  );
}
