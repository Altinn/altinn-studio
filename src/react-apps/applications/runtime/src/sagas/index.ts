import { SagaIterator, Task } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { sagaMiddleware } from '../store';

import FormConfigSagas from '../features/form/FormConfig/sagas';
import FormDataSagas from '../features/form/FormData/sagas';
import FormDynamicsSagas from '../features/form/FormDynamics/sagas';
import FormLayoutSagas from '../features/form/FormLayout/sagas';
import FormRulesSagas from '../features/form/FormRules/sagas';

function* root(): SagaIterator {
  yield fork(FormConfigSagas);
  yield fork(FormDataSagas);
  yield fork(FormDynamicsSagas);
  yield fork(FormLayoutSagas);
  yield fork(FormRulesSagas);
}

export const initSagas: () => Task = () => sagaMiddleware.run(root);