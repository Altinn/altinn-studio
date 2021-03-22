import { SagaIterator, Task } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { sagaMiddleware } from '../store';

import { watchHandleFetchInitialCommitSaga, watchHandleFetchServiceConfigSaga, watchHandleFetchServiceNameSaga, watchHandleFetchServiceSaga, watchHandleSaveServiceConfigSaga, watchHandleSaveServiceNameSaga } from '../features/administration/handleServiceInformationSagas';
import { watchHandleMergeConflictSaga } from '../features/handleMergeConflict/handleMergeConflictSagas';
import { appDeploymentSagas } from '../sharedResources/appDeployment/appDeploymentSagas';
import { applicationMetadataSagas } from '../sharedResources/applicationMetadata/applicationMetadataSagas';
import { appReleaseSagas } from '../sharedResources/appRelease/appReleaseSagas';
import languageSagas from '../utils/fetchLanguage/languageSagas';
import { appClusterSagas } from '../sharedResources/appCluster/appClusterSagas';
import { configurationSagas } from '../sharedResources/configuration/configurationSagas';
import { repoStatusSagas } from '../sharedResources/repoStatus/repoStatusSagas';
import { watchDeleteDataModelSaga, watchFetchDataModelSaga, watchSaveDataModelSaga } from '../features/dataModeling/dataModelingSagas';
import userSagas from '../sharedResources/user/userSagas';

function* root(): SagaIterator {
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
  yield fork(repoStatusSagas);
  yield fork(appReleaseSagas);
  yield fork(appDeploymentSagas);
  yield fork(configurationSagas);
  yield fork(watchFetchDataModelSaga);
  yield fork(watchSaveDataModelSaga);
  yield fork(watchDeleteDataModelSaga);
  yield fork(userSagas);
}

export const run: () => Task = () => sagaMiddleware.run(root);
