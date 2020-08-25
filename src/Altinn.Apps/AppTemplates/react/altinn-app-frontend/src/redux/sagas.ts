import { SagaIterator, Task } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { sagaMiddleware } from './store';

import FormDataSagas from '../features/form/data/formDataSagas';
import FormDataModelSagas from '../features/form/datamodel/formDatamodelSagas';
import InstantiationSagas from '../features/instantiate/instantiation/sagas';
import ApplicationMetadataSagas from '../resources/applicationMetadata/sagas';
import Attachments from '../resources/attachments/attachmentSagas';
import InstanceDataSagas from '../resources/instanceData/instanceDataSagas';
import LanguageSagas from '../resources/language/languageSagas';
import OrgsSagas from '../resources/orgs/orgsSagas';
import PartySagas from '../resources/party/partySagas';
import { processSagas } from '../resources/process/processSagas';
import ProfileSagas from '../resources/profile/profileSagas';
import TextResourcesSagas from '../resources/textResources/textResourcesSagas';
import IsLoadingSagas from '../resources/isLoading/isLoadingSagas';
import QueueSagas from '../resources/queue/queueSagas';
import OptionSagas from '../resources/options/optionsSagas';

function* root(): SagaIterator {
  yield fork(FormDataSagas);
  yield fork(Attachments);
  yield fork(FormDataModelSagas);
  yield fork(LanguageSagas);
  yield fork(TextResourcesSagas);
  yield fork(ProfileSagas);
  yield fork(PartySagas);
  yield fork(ApplicationMetadataSagas);
  yield fork(InstantiationSagas);
  yield fork(OrgsSagas);
  yield fork(InstanceDataSagas);
  yield fork(processSagas);
  yield fork(IsLoadingSagas);
  yield fork(QueueSagas);
  yield fork(OptionSagas);
}

export const initSagas: () => Task = () => sagaMiddleware.run(root);
