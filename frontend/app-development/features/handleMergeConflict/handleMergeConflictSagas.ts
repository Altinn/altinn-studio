import type { PayloadAction } from '@reduxjs/toolkit';
import type { SagaIterator } from 'redux-saga';
import { call, fork, put, takeLatest } from 'redux-saga/effects';
import { get } from 'app-shared/utils/networking';
import {
  fetchRepoStatus,
  fetchRepoStatusFulfilled,
  fetchRepoStatusRejected,
} from './handleMergeConflictSlice';
import type { IFetchRepoStatusAction } from './handleMergeConflictSlice';

export function* handleMergeConflictSaga({
  payload: { url },
}: PayloadAction<IFetchRepoStatusAction>): SagaIterator {
  try {
    const result = yield call(get, url);

    yield put(fetchRepoStatusFulfilled({ result }));
  } catch (error) {
    yield put(fetchRepoStatusRejected({ error }));
  }
}

export function* watchHandleMergeConflictSaga(): SagaIterator {
  yield takeLatest(fetchRepoStatus, handleMergeConflictSaga);
}

// eslint-disable-next-line func-names
export default function* (): SagaIterator {
  yield fork(watchHandleMergeConflictSaga);
}
