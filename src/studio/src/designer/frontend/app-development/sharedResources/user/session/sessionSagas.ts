import { get, post } from 'app-shared/utils/networking';
import { SagaIterator } from "redux-saga";
import { call, delay, put, takeLatest } from "redux-saga/effects";
import { getGiteaSignOutUrl, getKeepAliveUrl, getRemainingSessionTimeUrl, getStudioSignOutUrl } from "../../../utils/urlHelper";
import { fetchRemainingSession, fetchRemainingSessionFulfilled, fetchRemainingSessionRejected, keepAliveSession, keepAliveSessionFulfilled, keepAliveSessionRejected, signOutUser } from "../userSlice";


export function* fetchRemainingSessionSaga(): SagaIterator {
  try {
    const url = getRemainingSessionTimeUrl();
    const remainingMinutes: number = yield call(get, url);
    if (remainingMinutes < 0 ) {
      throw Error("negative remaining session time");
    }
    yield put(fetchRemainingSessionFulfilled({ remainingMinutes }));
    if (remainingMinutes > 10) {
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
    const url = getKeepAliveUrl();
    const addedMinutes = yield call(get, url);
    yield put(keepAliveSessionFulfilled({ addedMinutes}));
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
    yield call(post, getGiteaSignOutUrl());
    window.location.assign(getStudioSignOutUrl());
  } catch(error) {
    console.error(error);
  }
}

export function* watchSignOutUserSaga(): SagaIterator {
  yield takeLatest(signOutUser, signOutUserSaga);
}
