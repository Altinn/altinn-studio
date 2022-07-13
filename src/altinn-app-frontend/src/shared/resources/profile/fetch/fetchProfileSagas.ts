import type { SagaIterator } from 'redux-saga';
import { call, put, takeLatest } from 'redux-saga/effects';
import type { IProfile } from 'altinn-shared/types';
import { get } from '../../../../utils/networking';
import type { IFetchProfile } from 'src/shared/resources/profile';
import { userTaskQueueError } from '../../queue/queueSlice';
import type { PayloadAction } from '@reduxjs/toolkit';
import { ProfileActions } from '../profileSlice';

function* fetchProfileSaga({
  payload: { url },
}: PayloadAction<IFetchProfile>): SagaIterator {
  try {
    const profile: IProfile = yield call(get, url);
    yield put(ProfileActions.fetchFulfilled({ profile }));
  } catch (error) {
    yield put(ProfileActions.fetchRejected({ error }));
    yield put(userTaskQueueError({ error }));
  }
}

export function* watchFetchProfileSaga(): SagaIterator {
  yield takeLatest(ProfileActions.fetch, fetchProfileSaga);
}
