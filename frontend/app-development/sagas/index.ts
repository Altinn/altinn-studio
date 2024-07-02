import type { SagaIterator } from 'redux-saga';
import createSagaMiddleware from 'redux-saga';
import { fork } from 'redux-saga/effects';
import {
  watchHandleFetchServiceConfigSaga,
  watchHandleFetchServiceNameSaga,
  watchHandleFetchServiceSaga,
  watchHandleSaveServiceConfigSaga,
  watchHandleSaveServiceNameSaga,
} from '../features/overview/handleServiceInformationSagas';
import userSagas from '../sharedResources/user/userSagas';

function* root(): SagaIterator {
  yield fork(watchHandleFetchServiceSaga);
  yield fork(watchHandleFetchServiceNameSaga);
  yield fork(watchHandleSaveServiceNameSaga);
  yield fork(watchHandleFetchServiceConfigSaga);
  yield fork(watchHandleSaveServiceConfigSaga);
  yield fork(userSagas);
}

export const sagaMiddleware = createSagaMiddleware();

export const run = () => sagaMiddleware.run(root);
