import { SagaIterator, Task } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { sagaMiddleware } from '../store';

import dashboardSaga from '../dashboardServices/dashboardSagas';
import languageSagas from '../fetchLanguage/languageSagas';

function* root(): SagaIterator {
  yield fork(languageSagas);
  yield fork(dashboardSaga);
}

export const run: () => Task = () => sagaMiddleware.run(root);
