import type { SagaIterator } from 'redux-saga';
import { fork, all } from 'redux-saga/effects';

import { sagaMiddleware } from 'src/store';
import { rootSagas } from 'src/shared/resources/utils/sagaSlice';

function* root(): SagaIterator {
  yield all(rootSagas.map((saga) => fork(saga)));
}

export const initSagas = () => sagaMiddleware.run(root);
