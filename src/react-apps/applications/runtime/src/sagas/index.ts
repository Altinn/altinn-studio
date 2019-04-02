import { SagaIterator, Task } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { sagaMiddleware } from '../store';

import FormConfigSagas from '../features/form/config/sagas';
import FormDataSagas from '../features/form/data/sagas';
import FormDynamicsSagas from '../features/form/dynamics/sagas';
import FormLayoutSagas from '../features/form/layout/sagas';
import FormRulesSagas from '../features/form/rules/sagas';
import FormWorkflowSagas from '../features/form/workflow/sagas';
import FormDataModelSagas from '../features/form/datamodell/sagas';

function* root(): SagaIterator {
  yield fork(FormConfigSagas);
  yield fork(FormDataSagas);
  yield fork(FormDynamicsSagas);
  yield fork(FormLayoutSagas);
  yield fork(FormRulesSagas);
  yield fork(FormWorkflowSagas);
  yield fork(FormDataModelSagas);
}

export const initSagas: () => Task = () => sagaMiddleware.run(root);
