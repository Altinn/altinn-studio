import type { SagaIterator } from 'redux-saga';
import createSagaMiddleware from 'redux-saga';
import { fork } from 'redux-saga/effects';

import dashboardSaga from '../resources/fetchDashboardResources/dashboardSagas';
export const sagaMiddleware = createSagaMiddleware();

function* root(): SagaIterator {
  yield fork(dashboardSaga);
}

export const run = () => sagaMiddleware.run(root);
