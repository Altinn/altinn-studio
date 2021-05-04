import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watcherFinishDataTaskIsloadingSaga } from './dataTask/dataTaskIsLoadingSagas';
import { watcherFinishStatelessIsLoadingSaga } from './stateless/statelessIsLoadingSagas';

export default function* isLoadingSagas(): SagaIterator {
  yield fork(watcherFinishDataTaskIsloadingSaga);
  yield fork(watcherFinishStatelessIsLoadingSaga);
}
