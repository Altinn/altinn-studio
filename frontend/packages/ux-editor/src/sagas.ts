import type { SagaIterator, Task } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { sagaMiddleware } from './store';

import serviceConfigurationSagas from './features/serviceConfigurations/serviceConfigurationSagas';
import widgetsSagas from './features/widgets/widgetsSagas';

function* root(): SagaIterator {
  yield fork(serviceConfigurationSagas);
  yield fork(widgetsSagas);
}

export const run: () => Task = () => sagaMiddleware.run(root);
