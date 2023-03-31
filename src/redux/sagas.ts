import { all, fork } from 'redux-saga/effects';
import type { SagaIterator, SagaMiddleware } from 'redux-saga';

import { rootSagas } from 'src/redux/sagaSlice';

function* root(): SagaIterator {
  yield all(rootSagas.map((saga) => fork(saga)));
}

export const initSagas = (sagaMiddleware: SagaMiddleware<any>) => sagaMiddleware.run(root);
