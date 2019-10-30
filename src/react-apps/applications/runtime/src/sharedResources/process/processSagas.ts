import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchgetProcessStateSaga } from './getProcessState/getProcessStateSagas';

export function* processSagas(): SagaIterator {
  yield fork(watchgetProcessStateSaga);
}
