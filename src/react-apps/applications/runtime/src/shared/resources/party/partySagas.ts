import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchGetPartiesSaga } from './getParties/getPartiesSagas';
import { watchSelectPartySaga } from './selectParty/selectPartySagas';

export default function*(): SagaIterator {
  yield fork(watchGetPartiesSaga);
  yield fork(watchSelectPartySaga);
}
