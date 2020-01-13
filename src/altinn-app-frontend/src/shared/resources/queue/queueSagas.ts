import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchStartInitialDataTaskQueueSaga } from './dataTask/dataTaskQueueSagas';

export default function*(): SagaIterator {
  yield fork(watchStartInitialDataTaskQueueSaga);
}
