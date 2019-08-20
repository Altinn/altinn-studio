import { SagaIterator, Task } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { sagaMiddleware } from '../store';

import FormConfigSagas from '../features/form/config/sagas';
import FormDataSagas from '../features/form/data/sagas';
import FormDataModelSagas from '../features/form/datamodell/sagas';
import FormDynamicsSagas from '../features/form/dynamics/sagas';
import FormLayoutSagas from '../features/form/layout/sagas';
import FormRulesSagas from '../features/form/rules/sagas';
import FormValidationSagas from '../features/form/validation/sagas';
import FormWorkflowSagas from '../features/form/workflow/sagas';
import InstantiationSagas from '../features/instantiate/instantiation/sagas';
import ApplicationMetadataSagas from '../shared/resources/applicationMetadata/sagas';
import Attachments from '../shared/resources/attachments/attachmentSagas';
import LanguageSagas from '../shared/resources/language/languageSagas';
import PartySagas from '../shared/resources/party/partySagas';
import ProfileSagas from '../shared/resources/profile/profileSagas';
import TextResourcesSagas from '../shared/resources/textResources/sagas';

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
  yield fork(TextResourcesSagas);
  yield fork(ProfileSagas);
  yield fork(FormValidationSagas);
  yield fork(PartySagas);
  yield fork(ApplicationMetadataSagas);
  yield fork(InstantiationSagas);
}

export const initSagas: () => Task = () => sagaMiddleware.run(root);
