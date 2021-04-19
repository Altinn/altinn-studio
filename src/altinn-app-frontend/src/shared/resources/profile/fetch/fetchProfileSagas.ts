import { SagaIterator } from 'redux-saga';
import { call, put, takeLatest } from 'redux-saga/effects';
import { IProfile } from 'altinn-shared/types';
import { get } from '../../../../utils/networking';
import ProfileActions from '../profileActions';
import { IFetchProfile } from './fetchProfileActions';
import * as ProfileActionTypes from './fetchProfileActionTypes';
import { appTaskQueueError } from '../../queue/queueSlice';

function* fetchProfileSaga({ url }: IFetchProfile): SagaIterator {
  try {
    const profile: IProfile = yield call(get, url);
    yield call(
      ProfileActions.fetchProfileFulfilled,
      profile,
    );
  } catch (error) {
    yield call(ProfileActions.fetchProfileRejected, error);
    yield put(appTaskQueueError({ error }));
  }
}

export function* watchFetchProfileSaga(): SagaIterator {
  yield takeLatest(ProfileActionTypes.FETCH_PROFILE, fetchProfileSaga);
}
