import { SagaIterator, Task } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { sagaMiddleware } from '../store';

import FormConfigSagas from '../features/form/config/sagas';
import FormDataSagas from '../features/form/data/sagas';
import FormDataModelSagas from '../features/form/datamodell/sagas';
import FormDynamicsSagas from '../features/form/dynamics/sagas';
import FormLayoutSagas from '../features/form/layout/sagas';
import FormResourceSagas from '../features/form/resources/sagas';
import FormRulesSagas from '../features/form/rules/sagas';
import FormValidationSagas from '../features/form/validation/sagas';
import FormWorkflowSagas from '../features/form/workflow/sagas';
import Attachments from '../sharedResources/attachments/attachmentSagas';
import LanguageSagas from '../sharedResources/language/langaugeSagas';
import ProfileSagas from '../sharedResources/profile/profileSagas';

function* root(): SagaIterator {
  yield fork(FormConfigSagas);
  yield fork(FormDataSagas);
  yield fork(FormDynamicsSagas);
  yield fork(Attachments);
  yield fork(FormLayoutSagas);
  yield fork(FormRulesSagas);
  yield fork(FormWorkflowSagas);
  yield fork(FormDataModelSagas);
  yield fork(LanguageSagas);
  yield fork(FormResourceSagas);
  yield fork(ProfileSagas);
  yield fork(FormValidationSagas);
}

export const initSagas: () => Task = () => sagaMiddleware.run(root);
