import { PayloadAction } from '@reduxjs/toolkit';
import { SagaIterator } from 'redux-saga';
import { call, put, takeLatest } from 'redux-saga/effects';
import { get } from 'app-shared/utils/networking';
import { RepoStatusActions } from '../repoStatusSlice';
import type { IRepoStatusAction } from '../repoStatusSlice';
import { fetchRepoStatus } from '../../../features/handleMergeConflict/handleMergeConflictSlice';
import { repoStatusUrl } from '../../../utils/urlHelper';
import postMessages from 'app-shared/utils/postMessages';

// GET MASTER REPO
export function* resetLocalRepoSaga({
  payload: { org, repo },
}: PayloadAction<IRepoStatusAction>): SagaIterator {
  try {
    const result = yield call(
      get,
      `/designer/api/v1/repos/${org}/${repo}/reset`,
    );

    yield put(
      fetchRepoStatus({
        url: repoStatusUrl,
        org,
        repo,
      }),
    );
    window.postMessage(postMessages.filesAreSaved, window.location.href);
    yield put(RepoStatusActions.resetLocalRepoFulfilled({ result }));
  } catch (error) {
    yield put(RepoStatusActions.resetLocalRepoRejected({ error }));
  }
}

export function* watchResetLocalRepoSaga(): SagaIterator {
  yield takeLatest(RepoStatusActions.resetLocalRepo, resetLocalRepoSaga);
}

