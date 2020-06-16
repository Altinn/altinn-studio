import { SagaIterator } from 'redux-saga';
import { call, fork, takeLatest } from 'redux-saga/effects';
import { get } from 'app-shared/utils/networking';
import * as RepoStatusActionTypes from '../repoStatusActionTypes';
import RepoStatusDispatchers from '../repoStatusDispatcher';
import HandleMergeConflictDispatchers from '../../../features/handleMergeConflict/handleMergeConflictDispatcher';
import * as ResetLocalRepoActions from './resetLocalRepoActions';
import { getRepoStatusUrl } from '../../../utils/urlHelper';

// GET MASTER REPO
export function* resetLocalRepoSaga({
  org,
  repo,
}: ResetLocalRepoActions.IResetLocalRepo): SagaIterator {
  try {
    const result = yield call(get,
      `/designerapi/Repository/ResetLocalRepository?org=${org}&repository=${repo}`);

    yield call(HandleMergeConflictDispatchers.fetchRepoStatus, getRepoStatusUrl(), org, repo);

    yield call(RepoStatusDispatchers.resetLocalRepoFulfilled, result);
  } catch (err) {
    yield call(RepoStatusDispatchers.resetLocalRepoRejected, err);
  }
}

export function* watchResetLocalRepoSaga(): SagaIterator {
  yield takeLatest(
    RepoStatusActionTypes.RESET_LOCAL_REPO,
    resetLocalRepoSaga,
  );
}

// WATCHES EXPORT
export function* repoStatusSagas(): SagaIterator {
  yield fork(watchResetLocalRepoSaga);
  // Insert all watchSagas here
}
