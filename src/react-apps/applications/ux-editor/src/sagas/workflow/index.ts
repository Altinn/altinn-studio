import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchGetCurrentStateSaga } from './workflowSagas';

export default function* (): SagaIterator {
  yield fork(watchGetCurrentStateSaga);
}
