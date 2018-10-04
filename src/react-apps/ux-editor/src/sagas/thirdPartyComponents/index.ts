import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchFetchThirdPartComponentsSaga } from './thirdPartyComponentsSagas';

export default function* (): SagaIterator {
  yield fork(watchFetchThirdPartComponentsSaga);
}