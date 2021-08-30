import { AxiosError } from 'axios';
import { SagaIterator } from 'redux-saga';
import { delay, call, fork, put, race, take, takeLatest } from 'redux-saga/effects';
import { checkIfAxiosError } from 'app-shared/utils/networking';
import { get } from '../../../utils/networking';
import { releasesGetUrl } from '../../../utils/urlHelper';
import { AppReleaseActions } from '../appReleaseSlice';

function* getReleasesSaga(): SagaIterator {
  try {
    const result: any = yield call(get, releasesGetUrl);
    yield put(AppReleaseActions.getAppReleasesFulfilled({ releases: result.results }));
  } catch (error) {
    if (checkIfAxiosError(error)) {
      const { response: { status } } = error as AxiosError;
      yield put(AppReleaseActions.getAppReleasesRejected({ errorCode: status }));
    }
  }
}

export function* watchGetReleasesSaga(): SagaIterator {
  yield takeLatest(AppReleaseActions.getAppRelease, getReleasesSaga);
}

function* getReleasesIntervalSaga(): SagaIterator {
  while (true) {
    try {
      yield call(getReleasesSaga);
      yield delay(5000);
    } catch (error) {
      yield put(AppReleaseActions.getAppReleasesRejected({ errorCode: 1 }));
    }
  }
}

function* watchGetReleasesIntervalSaga(): SagaIterator {
  while (true) {
    yield take(AppReleaseActions.getAppReleaseStartInterval);
    yield race({
      do: call(getReleasesIntervalSaga),
      cancel: take(AppReleaseActions.getAppReleaseStopInterval),
    });
  }
}

// eslint-disable-next-line func-names
export default function* (): SagaIterator {
  yield fork(watchGetReleasesSaga);
  yield fork(watchGetReleasesIntervalSaga);
}
