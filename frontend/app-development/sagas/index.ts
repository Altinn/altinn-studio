import createSagaMiddleware, { type SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import {
  watchHandleFetchInitialCommitSaga,
  watchHandleFetchServiceConfigSaga,
  watchHandleFetchServiceNameSaga,
  watchHandleFetchServiceSaga,
  watchHandleSaveServiceConfigSaga,
  watchHandleSaveServiceNameSaga,
} from '../features/overview/handleServiceInformationSagas';
import { appDeploymentSagas } from '../sharedResources/appDeployment/appDeploymentSagas';
import { applicationMetadataSagas } from '../sharedResources/applicationMetadata/applicationMetadataSagas';
import userSagas from '../sharedResources/user/userSagas';

function* root(): SagaIterator {
  yield fork(watchHandleFetchServiceSaga);
  yield fork(watchHandleFetchServiceNameSaga);
  yield fork(watchHandleSaveServiceNameSaga);
  yield fork(watchHandleFetchInitialCommitSaga);
  yield fork(watchHandleFetchServiceConfigSaga);
  yield fork(watchHandleSaveServiceConfigSaga);
  yield fork(applicationMetadataSagas);
  yield fork(appDeploymentSagas);
  yield fork(userSagas);
}

export const sagaMiddleware = createSagaMiddleware();

export const run = () => sagaMiddleware.run(root);
