import { call, put } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { SagaIterator } from 'redux-saga';

import { ProfileActions } from 'src/shared/resources/profile/profileSlice';
import { QueueActions } from 'src/shared/resources/queue/queueSlice';
import { httpGet } from 'src/utils/network/networking';
import type { IFetchProfile } from 'src/shared/resources/profile';
import type { IProfile } from 'src/types/shared';

export function* fetchProfileSaga({ payload: { url } }: PayloadAction<IFetchProfile>): SagaIterator {
  try {
    const profile: IProfile = yield call(httpGet, url);
    yield put(ProfileActions.fetchFulfilled({ profile }));
  } catch (error) {
    yield put(ProfileActions.fetchRejected({ error }));
    yield put(QueueActions.userTaskQueueError({ error }));
  }
}
