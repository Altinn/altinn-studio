import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchCreateReleaseSaga } from './create/createAppReleaseSagas';
import { watchGetReleasesSaga } from './get/getAppReleasesSagas';

export function* appReleaseSagas(): SagaIterator {
  yield fork(watchCreateReleaseSaga);
  yield fork(watchGetReleasesSaga);
}
