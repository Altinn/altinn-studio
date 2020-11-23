import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watcherFinishDataTaskIsloadingSaga } from './dataTask/dataTaskIsLoadingSagas';

export default function* isLoadingSagas(): SagaIterator {
  yield fork(watcherFinishDataTaskIsloadingSaga);
}
