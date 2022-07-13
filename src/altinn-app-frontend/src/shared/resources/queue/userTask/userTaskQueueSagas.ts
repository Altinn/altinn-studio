import type { SagaIterator } from 'redux-saga';
import { call, put, take } from 'redux-saga/effects';
import {
  startInitialUserTaskQueue,
  startInitialUserTaskQueueFulfilled,
} from '../queueSlice';
import { ProfileActions } from '../../profile/profileSlice';
import { PartyActions } from 'src/shared/resources/party/partySlice';
import { profileApiUrl } from 'src/utils/appUrlHelper';

export function* startInitialUserTaskQueueSaga(): SagaIterator {
  yield put(ProfileActions.fetch({ url: profileApiUrl }));
  yield put(PartyActions.getCurrentParty());

  yield put(startInitialUserTaskQueueFulfilled());
}

export function* watchStartInitialUserTaskQueueSaga(): SagaIterator {
  yield take(startInitialUserTaskQueue);
  yield call(startInitialUserTaskQueueSaga);
}
