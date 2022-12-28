import type { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchFetchDeployPermissionsSaga } from './permissions/permissionsSaga';
import {
  watchFetchRemainingSessionSaga,
  watchKeepAliveSaga,
  watchSignOutUserSaga,
} from './session/sessionSagas';

export default function* userSagas(): SagaIterator {
  yield fork(watchFetchDeployPermissionsSaga);
  yield fork(watchFetchRemainingSessionSaga);
  yield fork(watchKeepAliveSaga);
  yield fork(watchSignOutUserSaga);
}
