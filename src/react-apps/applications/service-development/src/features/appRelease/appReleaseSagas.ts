import { SagaIterator } from 'redux-saga';
import { call, fork, takeLatest } from 'redux-saga/effects';
import * as AppReleaseActionTypes from './appReleaseActionTypes';
import AppReleaseActionDispatcher from './appReleaseDispatcher';

function* fetchReleasesSaga(): SagaIterator {
  try {
    yield call(AppReleaseActionDispatcher.fetchReleasesFulfilled, []);
  } catch (err) {
    yield call(AppReleaseActionDispatcher.fetchReleasesRejected, err);
  }
}

function* watchFetchReleasesSaga(): SagaIterator {
  yield takeLatest(
    AppReleaseActionTypes.FETCH_APP_DEPLOYMENTS,
    fetchReleasesSaga,
  );
}

function* createReleaseSaga(): SagaIterator {
  try {
    yield call(AppReleaseActionDispatcher.createReleaseFulfilled, 'release-id');
  } catch (err) {
    yield call(AppReleaseActionDispatcher.createReleaseRejected, err);
  }
}

function* watchCreateReleaseSaga(): SagaIterator {
  yield takeLatest(
    AppReleaseActionTypes.CREATE_APP_DEPLOYMENT,
    createReleaseSaga,
  );
}

export default function*(): SagaIterator {
  yield fork(watchFetchReleasesSaga);
  yield fork(watchCreateReleaseSaga);
}
