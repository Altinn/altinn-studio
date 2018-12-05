import { SagaIterator, Task } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { sagaMiddleware } from '../store';

import fetchLanguageSaga from '../fetchLanguage/fetchLanguageSagas';
import fetchDashboardSaga from '../Organization/fetchDashboardSagas';

function* root(): SagaIterator {
  yield fork(fetchLanguageSaga);
  yield fork(fetchDashboardSaga);
}

export const run: () => Task = () => sagaMiddleware.run(root);
