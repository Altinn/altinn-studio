import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';
import { get } from '../../../../utils/networking';
import ProfileActions from '../profileActions';
import { IFetchProfile } from './fetchProfileActions';
import * as ProfileActionTypes from './fetchProfileActionTypes';

function* fetchProfileSaga({ url }: IFetchProfile): SagaIterator {
  try {
    const profile = yield call(get, url);
    yield call(
      ProfileActions.fetchProfileFulfilled, profile);
  } catch (err) {
    yield call(ProfileActions.fetchProfileRejected, err);
  }
}

export function* watchFetchProfileSaga(): SagaIterator {
  yield takeLatest(ProfileActionTypes.FETCH_PROFILE, fetchProfileSaga);
}
