import { SagaIterator, Task } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { sagaMiddleware } from '../store';

import fetchLanguageSaga from '../fetchLanguage/fetchLanguageSagas';

function* root(): SagaIterator {
  yield fork(fetchLanguageSaga);
}

export const run: () => Task = () => sagaMiddleware.run(root);