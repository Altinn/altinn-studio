import type { SagaIterator } from 'redux-saga';
import { call, put, take } from 'redux-saga/effects';
import {
  startInitialUserTaskQueue,
  startInitialUserTaskQueueFulfilled,
} from '../queueSlice';
import ProfileActions from '../../profile/profileActions';
import PartyActions from '../../party/partyActions';
import { profileApiUrl } from 'src/utils/appUrlHelper';

export function* startInitialUserTaskQueueSaga(): SagaIterator {
  yield call(ProfileActions.fetchProfile, profileApiUrl);
  yield call(PartyActions.getCurrentParty);

  yield put(startInitialUserTaskQueueFulfilled());
}

export function* watchStartInitialUserTaskQueueSaga(): SagaIterator {
  yield take(startInitialUserTaskQueue);
  yield call(startInitialUserTaskQueueSaga);
}
