import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchStartInitialDataTaskQueueSaga } from './dataTask/dataTaskQueueSagas';
import { watchStartInitialAppTaskQueueSaga } from './appTask/appTaskQueueSagas';
import { watchStartInitialInfoTaskQueueSaga } from './infoTask/infoTaskQueueSaga';
import { watchStartInitialStatelessQueueSaga } from './stateless/statelessQueueSaga';

export default function* queueSagas(): SagaIterator {
  yield fork(watchStartInitialDataTaskQueueSaga);
  yield fork(watchStartInitialAppTaskQueueSaga);
  yield fork(watchStartInitialInfoTaskQueueSaga);
  yield fork(watchStartInitialStatelessQueueSaga);
}
