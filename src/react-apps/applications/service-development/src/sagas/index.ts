import { SagaIterator, Task } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { sagaMiddleware } from '../store';

import { watchHandleFetchServiceSaga } from '../features/administration/handleFetchServiceSagas';
import { watchHandleMergeConflictSaga } from '../features/handleMergeConflict/handleMergeConflictSagas'
import languageSagas from '../utils/fetchLanguage/languageSagas';

function* root(): SagaIterator {
  yield fork(languageSagas);
  yield fork(watchHandleMergeConflictSaga);
  yield fork(watchHandleFetchServiceSaga);
}

export const run: () => Task = () => sagaMiddleware.run(root);
