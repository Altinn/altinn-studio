import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchFetchThirdPartComponentsSaga } from './thirdPartyComponentsSagas';

// eslint-disable-next-line func-names
export default function* (): SagaIterator {
  yield fork(watchFetchThirdPartComponentsSaga);
}
