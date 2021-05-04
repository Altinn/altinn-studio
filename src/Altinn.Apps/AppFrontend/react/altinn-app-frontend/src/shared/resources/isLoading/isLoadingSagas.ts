import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watcherFinishDataTaskIsloadingSaga } from './dataTask/dataTaskIsLoadingSagas';
import { watcherFinishStatlessIsLoadingSaga } from './stateless/statelessIsLoadingSagas';

export default function* isLoadingSagas(): SagaIterator {
  yield fork(watcherFinishDataTaskIsloadingSaga);
  yield fork(watcherFinishStatlessIsLoadingSaga);
}
