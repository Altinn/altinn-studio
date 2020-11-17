import { SagaIterator } from 'redux-saga';
import { call, fork, takeLatest } from 'redux-saga/effects';
import { get } from 'app-shared/utils/networking';
import * as HandleMergeConflictActions from './handleMergeConflictActions';
import * as HandleMergeConclictActionTypes from './handleMergeConflictActionTypes';
import HandleMergeConflictDispatchers from './handleMergeConflictDispatcher';

export function* handleMergeConflictSaga({ url }: HandleMergeConflictActions.IFetchRepoStatusAction): SagaIterator {
  try {
    const result = yield call(get, url);

    yield call(HandleMergeConflictDispatchers.fetchRepoStatusFulfilled, result);
  } catch (err) {
    yield call(HandleMergeConflictDispatchers.fetchRepoStatusRejected, err);
  }
}

export function* watchHandleMergeConflictSaga(): SagaIterator {
  yield takeLatest(
    HandleMergeConclictActionTypes.FETCH_REPO_STATUS,
    handleMergeConflictSaga,
  );
}

// eslint-disable-next-line func-names
export default function* (): SagaIterator {
  yield fork(watchHandleMergeConflictSaga);
}
