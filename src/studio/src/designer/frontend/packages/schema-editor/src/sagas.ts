import type { SagaIterator } from 'redux-saga';
import createSagaMiddleware from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchAutosaveModelSaga } from './features/editor/schemaEditorSaga';

function* root(): SagaIterator {
  yield fork(watchAutosaveModelSaga);
}

export const sagaMiddleware = createSagaMiddleware();

export const run = () => sagaMiddleware.run(root);
