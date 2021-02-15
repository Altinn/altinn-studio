import { PayloadAction } from '@reduxjs/toolkit';
import { SagaIterator } from 'redux-saga';
import { call, fork, put, takeLatest } from 'redux-saga/effects';
import { get } from 'app-shared/utils/networking';
import { IRepoStatusAction, RepoStatusActions } from '../repoStatusSlice';
import { fetchRepoStatus } from '../../../features/handleMergeConflict/handleMergeConflictSlice';
import { getRepoStatusUrl } from '../../../utils/urlHelper';

// GET MASTER REPO
export function* resetLocalRepoSaga({ payload: {
  org,
  repo,
} }: PayloadAction<IRepoStatusAction>): SagaIterator {
  try {
    const result = yield call(get,
      `/designerapi/Repository/ResetLocalRepository?org=${org}&repository=${repo}`);

    yield put(fetchRepoStatus({
      url: getRepoStatusUrl(),
      org,
      repo,
    }));

    yield put(RepoStatusActions.resetLocalRepoFulfilled({ result }));
  } catch (error) {
    yield put(RepoStatusActions.resetLocalRepoRejected({ error }));
  }
}

export function* watchResetLocalRepoSaga(): SagaIterator {
  yield takeLatest(RepoStatusActions.resetLocalRepo, resetLocalRepoSaga);
}

// WATCHES EXPORT
export function* repoStatusSagas(): SagaIterator {
  yield fork(watchResetLocalRepoSaga);
  // Insert all watchSagas here
}
