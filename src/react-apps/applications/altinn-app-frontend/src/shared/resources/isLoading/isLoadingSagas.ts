import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watcherFinishDataTaskIsloadingSaga } from './dataTask/dataTaskIsLoadingSagas';

export default function*(): SagaIterator {
  yield fork(watcherFinishDataTaskIsloadingSaga);
}
