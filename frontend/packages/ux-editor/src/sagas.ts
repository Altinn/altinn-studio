import type { SagaIterator, Task } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { sagaMiddleware } from './store';

import widgetsSagas from './features/widgets/widgetsSagas';

function* root(): SagaIterator {
  yield fork(widgetsSagas);
}

export const run: () => Task = () => sagaMiddleware.run(root);
