import type { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchCreateReleaseSaga } from './create/createAppReleaseSagas';
import WatchGetReleasesSagas from './get/getAppReleasesSagas';

export function* appReleaseSagas(): SagaIterator {
  yield fork(watchCreateReleaseSaga);
  yield fork(WatchGetReleasesSagas);
}
