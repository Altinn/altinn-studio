import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';

import { watchFetchProfileSaga } from './fetch/fetchProfileSagas';

export default function* (): SagaIterator {
  yield fork(watchFetchProfileSaga);
}
