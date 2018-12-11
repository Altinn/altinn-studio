import { SagaIterator, Task } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { sagaMiddleware } from '../store';

import languageSagas from '../fetchLanguage/languageSagas';
import dashboardSaga from '../services/dashboardSagas';

function* root(): SagaIterator {
  yield fork(languageSagas);
  yield fork(dashboardSaga);
}

export const run: () => Task = () => sagaMiddleware.run(root);
