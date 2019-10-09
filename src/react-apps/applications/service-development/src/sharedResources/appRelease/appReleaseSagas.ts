import { SagaIterator } from 'redux-saga';
import { call, fork, takeLatest } from 'redux-saga/effects';
import * as AppReleaseActionTypes from './appReleaseActionTypes';
import AppReleaseActionDispatcher from './appReleaseDispatcher';

function* getReleasesSaga(): SagaIterator {
  try {
    yield call(AppReleaseActionDispatcher.getReleasesFulfilled, []);
  } catch (err) {
    yield call(AppReleaseActionDispatcher.getReleasesRejected, err);
  }
}

function* watchGetReleasesSaga(): SagaIterator {
  yield takeLatest(
    AppReleaseActionTypes.GET_APP_RELEASES,
    getReleasesSaga,
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
    AppReleaseActionTypes.CREATE_APP_RELEASE,
    createReleaseSaga,
  );
}

export default function*(): SagaIterator {
  yield fork(watchGetReleasesSaga);
  yield fork(watchCreateReleaseSaga);
}
