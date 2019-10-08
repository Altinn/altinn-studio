import { SagaIterator, Task } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { sagaMiddleware } from '../store';

import { watchHandleFetchInitialCommitSaga, watchHandleFetchServiceConfigSaga, watchHandleFetchServiceNameSaga, watchHandleFetchServiceSaga, watchHandleSaveServiceConfigSaga, watchHandleSaveServiceNameSaga } from '../features/administration/handleServiceInformationSagas';
import { deploySagas } from '../features/deploy/deploySagas';
import { watchHandleMergeConflictSaga } from '../features/handleMergeConflict/handleMergeConflictSagas';
import { applicationMetadataSagas } from '../sharedResources/applicationMetadata/applicationMetadataSagas';
import languageSagas from '../utils/fetchLanguage/languageSagas';
import { appClusterSagas } from './../sharedResources/appCluster/appClusterSagas';

function* root(): SagaIterator {
  yield fork(deploySagas);
  yield fork(languageSagas);
  yield fork(watchHandleMergeConflictSaga);
  yield fork(watchHandleFetchServiceSaga);
  yield fork(watchHandleFetchServiceNameSaga);
  yield fork(watchHandleSaveServiceNameSaga);
  yield fork(watchHandleFetchInitialCommitSaga);
  yield fork(watchHandleFetchServiceConfigSaga);
  yield fork(watchHandleSaveServiceConfigSaga);
  yield fork(applicationMetadataSagas);
  yield fork(appClusterSagas);
}

export const run: () => Task = () => sagaMiddleware.run(root);
