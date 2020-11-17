import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchFetchCodeListsSaga } from './codeListsSagas';

// eslint-disable-next-line func-names
export default function* (): SagaIterator {
  yield fork(watchFetchCodeListsSaga);
}
