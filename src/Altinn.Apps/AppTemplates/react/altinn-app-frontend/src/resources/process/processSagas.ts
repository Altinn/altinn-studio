import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchCompleteProcessSaga } from './completeProcess/completeProcessSagas';
import { watchGetProcessStateSaga } from './getProcessState/getProcessStateSagas';
import { watchCheckProcessUpdatedSaga } from './checkProcessUpdated/checkProcessUpdatedSagas';

export function* processSagas(): SagaIterator {
  yield fork(watchGetProcessStateSaga);
  yield fork(watchCompleteProcessSaga);
  yield fork(watchCheckProcessUpdatedSaga);
}
