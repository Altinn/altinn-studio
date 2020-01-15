import { SagaIterator, Task } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { sagaMiddleware } from '../store';

import dashboardSaga from '../resources/fetchDashboardResources/dashboardSagas';
import languageSagas from '../resources/fetchLanguage/languageSagas';

function* root(): SagaIterator {
  yield fork(languageSagas);
  yield fork(dashboardSaga);
}

export const run: () => Task = () => sagaMiddleware.run(root);
