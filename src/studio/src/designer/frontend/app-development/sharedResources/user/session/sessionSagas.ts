import { get, post } from 'app-shared/utils/networking';
import { SagaIterator } from 'redux-saga';
import { call, delay, put, takeLatest } from 'redux-saga/effects';
import { giteaSignOutUrl, keepAliveUrl, remainingSessionTimeUrl, studioSignOutUrl } from '../../../utils/urlHelper';
import { fetchRemainingSession, fetchRemainingSessionFulfilled, fetchRemainingSessionRejected, keepAliveSession, keepAliveSessionFulfilled, keepAliveSessionRejected, signOutUser } from '../userSlice';

export function* fetchRemainingSessionSaga(): SagaIterator {
  try {
    const remainingMinutes: number = yield call(get, remainingSessionTimeUrl);
    if (remainingMinutes < 0) {
      throw Error('negative remaining session time');
    }
    yield put(fetchRemainingSessionFulfilled({ remainingMinutes }));
    if (remainingMinutes > 30) {
      yield delay((remainingMinutes - 30) * 60 * 1000);
      yield put(fetchRemainingSession());
    } else if (remainingMinutes > 10) {
      yield delay((remainingMinutes - 10) * 60 * 1000);
      yield put(fetchRemainingSession());
    }
  } catch (error) {
    yield put(fetchRemainingSessionRejected({ error }));
  }
}

export function* watchFetchRemainingSessionSaga(): SagaIterator {
  yield takeLatest(fetchRemainingSession, fetchRemainingSessionSaga);
}

export function* keepAliveSessionSaga(): SagaIterator {
  try {
    const remainingMinutes = yield call(get, keepAliveUrl);
    yield put(keepAliveSessionFulfilled({ remainingMinutes }));
    yield delay(10 * 60 * 1000);
    yield put(fetchRemainingSession());
  } catch (error) {
    if (error.response && error.response.status === 401) {
      yield put(signOutUser());
    } else {
      yield put(keepAliveSessionRejected({ error }));
    }
  }
}

export function* watchKeepAliveSaga(): SagaIterator {
  yield takeLatest(keepAliveSession, keepAliveSessionSaga);
}

export function* signOutUserSaga(): SagaIterator {
  try {
    yield call(post, giteaSignOutUrl);
    window.location.assign(studioSignOutUrl);
  } catch (error) {
    console.error(error);
  }
}

export function* watchSignOutUserSaga(): SagaIterator {
  yield takeLatest(signOutUser, signOutUserSaga);
}
