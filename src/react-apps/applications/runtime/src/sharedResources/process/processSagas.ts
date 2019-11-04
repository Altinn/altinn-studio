import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchGetProcessStateSaga } from './getProcessState/getProcessStateSagas';
import { watchStartProcessSaga } from './startProcess/startProcessSagas';

export function* processSagas(): SagaIterator {
  yield fork(watchGetProcessStateSaga);
  yield fork(watchStartProcessSaga);
}
