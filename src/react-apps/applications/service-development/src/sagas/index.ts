import { SagaIterator, Task } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { sagaMiddleware } from '../store';

import { watchHandleFetchInitialCommitSaga, watchHandleFetchServiceDescriptionSaga, watchHandleFetchServiceNameSaga, watchHandleFetchServiceSaga, watchHandleSaveServiceDescriptionSaga, watchHandleSaveServiceNameSaga } from '../features/administration/handleServiceInformationSagas';
import { watchHandleMergeConflictSaga } from '../features/handleMergeConflict/handleMergeConflictSagas';
import languageSagas from '../utils/fetchLanguage/languageSagas';

function* root(): SagaIterator {
  yield fork(languageSagas);
  yield fork(watchHandleMergeConflictSaga);
  yield fork(watchHandleFetchServiceSaga);
  yield fork(watchHandleFetchServiceNameSaga);
  yield fork(watchHandleSaveServiceNameSaga);
  yield fork(watchHandleFetchInitialCommitSaga);
  yield fork(watchHandleFetchServiceDescriptionSaga);
  yield fork(watchHandleSaveServiceDescriptionSaga);
}

export const run: () => Task = () => sagaMiddleware.run(root);
