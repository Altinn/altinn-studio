import createSagaMiddleware, { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';

import dashboardSaga from '../resources/fetchDashboardResources/dashboardSagas';
import languageSagas from '../resources/fetchLanguage/languageSagas';

export const sagaMiddleware = createSagaMiddleware();

function* root(): SagaIterator {
  yield fork(languageSagas);
  yield fork(dashboardSaga);
}

export const run = () => sagaMiddleware.run(root);
