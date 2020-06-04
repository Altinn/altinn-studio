import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchGetMasterRepoStatusSaga } from './get/getMasterRepoStatusSagas';
import { watchResetLocalRepoSaga } from './reset/resetLocalRepoSagas';

// eslint-disable-next-line import/prefer-default-export
export function* repoStatusSagas(): SagaIterator {
  yield fork(watchGetMasterRepoStatusSaga);
  yield fork(watchResetLocalRepoSaga);
}
