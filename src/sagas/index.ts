import { all, fork } from 'redux-saga/effects';
import type { SagaIterator } from 'redux-saga';

import { rootSagas } from 'src/shared/resources/utils/sagaSlice';
import { sagaMiddleware } from 'src/store';

function* root(): SagaIterator {
  yield all(rootSagas.map((saga) => fork(saga)));
}

export const initSagas = () => sagaMiddleware.run(root);
