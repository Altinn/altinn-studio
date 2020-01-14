import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchGetMasterRepoStatusSaga } from './get/getMasterRepoStatusSagas';

export function* repoStatusSagas(): SagaIterator {
  yield fork(watchGetMasterRepoStatusSaga);
}
