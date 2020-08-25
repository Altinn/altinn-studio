import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchFetchOrgsSaga } from './fetch/fetchOrgsSagas';

export default function*(): SagaIterator {
  yield fork(watchFetchOrgsSaga);
}
