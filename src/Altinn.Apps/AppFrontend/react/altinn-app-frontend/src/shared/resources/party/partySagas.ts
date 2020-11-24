import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchGetPartiesSaga, watchGetCurrentPartySaga } from './getParties/getPartiesSagas';
import { watchSelectPartySaga } from './selectParty/selectPartySagas';

export default function* partySagas(): SagaIterator {
  yield fork(watchGetPartiesSaga);
  yield fork(watchGetCurrentPartySaga);
  yield fork(watchSelectPartySaga);
}
