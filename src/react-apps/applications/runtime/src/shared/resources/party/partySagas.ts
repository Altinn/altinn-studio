import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchGetPartiesSaga } from './getParties/getPartiesSagas';

export default function*(): SagaIterator {
  yield fork(watchGetPartiesSaga);
}
