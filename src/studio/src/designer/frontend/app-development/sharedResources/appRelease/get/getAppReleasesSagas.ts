import { AxiosError } from 'axios';
import { SagaIterator } from 'redux-saga';
import { delay } from 'redux-saga/effects';
import { call, fork, race, take, takeLatest } from 'redux-saga/effects';
import { checkIfAxiosError } from 'app-shared/utils/networking';
import { get } from '../../../utils/networking';
import { releasesUrlGet } from '../../../utils/urlHelper';
import * as AppReleaseActionTypes from '../appReleaseActionTypes';
import AppReleaseActionDispatcher from '../appReleaseDispatcher';

function* getReleasesSaga(): SagaIterator {
  try {
    const result: any = yield call(get, releasesUrlGet);
    yield call(AppReleaseActionDispatcher.getAppReleasesFulfilled, result.results);
  } catch (err) {
    if (checkIfAxiosError(err)) {
      const { response: { status } } = err as AxiosError;
      yield call(AppReleaseActionDispatcher.getAppReleasesRejected, status);
    }
  }
}

export function* watchGetReleasesSaga(): SagaIterator {
  yield takeLatest(
    AppReleaseActionTypes.GET_APP_RELEASES,
    getReleasesSaga,
  );
}

function* getReleasesIntervalSaga(): SagaIterator {
  while (true) {
    try {
      yield call(getReleasesSaga);
      yield delay(5000);
    } catch (err) {
      yield call(AppReleaseActionDispatcher.getAppReleasesRejected, 1);
    }
  }
}

function* watchGetReleasesIntervalSaga(): SagaIterator {
  while (true) {
    yield take(AppReleaseActionTypes.GET_APP_RELEASES_START_INTERVAL);
    yield race({
      do: call(getReleasesIntervalSaga),
      cancel: take(AppReleaseActionTypes.GET_APP_RELEASES_STOP_INTERVAL),
    });
  }
}

// eslint-disable-next-line func-names
export default function* (): SagaIterator {
  yield fork(watchGetReleasesSaga);
  yield fork(watchGetReleasesIntervalSaga);
}
