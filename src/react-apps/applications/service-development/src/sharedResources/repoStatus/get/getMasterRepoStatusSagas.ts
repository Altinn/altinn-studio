import { SagaIterator } from 'redux-saga';
import { call, fork, takeLatest } from 'redux-saga/effects';
import { get } from '../../../../../shared/src/utils/networking';
import * as RepoStatusActionTypes from '../repoStatusActionTypes';
import RepoStatusDispatchers from '../repoStatusDispatcher';
import * as GetMasterRepoStatusActions from './getMasterRepoStatusActions';

// GET MASTER REPO
export function* getMasterRepoStatusSaga({
  org,
  repo,
}: GetMasterRepoStatusActions.IGetMasterRepoStatus): SagaIterator {
  try {
    const result = yield call(get,
      `/designerapi/Repository/Branch?org=${org}&repository=${repo}&branch=master`);

    yield call(RepoStatusDispatchers.getMasterRepoStatusFulfilled, result);
  } catch (err) {
    yield call(RepoStatusDispatchers.getMasterRepoStatusRejected, err);
  }
}

export function* watchGetMasterRepoStatusSaga(): SagaIterator {
  yield takeLatest(
    RepoStatusActionTypes.GET_MASTER_REPO_STATUS,
    getMasterRepoStatusSaga,
  );
}

// WATCHES EXPORT
export function* repoStatusSagas(): SagaIterator {
  yield fork(watchGetMasterRepoStatusSaga);
  // Insert all watchSagas here
}
