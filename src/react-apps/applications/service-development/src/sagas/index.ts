import { SagaIterator, Task } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { sagaMiddleware } from '../store';

import languageSagas from '../utils/fetchLanguage/languageSagas';

function* root(): SagaIterator {
  yield fork(languageSagas);
}

export const run: () => Task = () => sagaMiddleware.run(root);
