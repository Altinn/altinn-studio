import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchGetCurrentStateSaga } from './workflowSagas';

// tslint:disable-next-line:space-before-function-paren
export default function* (): SagaIterator {
  yield fork(watchGetCurrentStateSaga);
}
