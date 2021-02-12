import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchFetchDeployPermissionsSaga } from './permissions/permissionsSaga';

export default function* userSagas(): SagaIterator {
  yield fork(watchFetchDeployPermissionsSaga);
}
