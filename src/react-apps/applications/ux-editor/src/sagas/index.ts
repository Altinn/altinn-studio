import { SagaIterator, Task } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { sagaMiddleware } from '../store';

import apiSagas from './api';
import appDataSagas from './appData';
import codeListsSagas from './codeLists';
import conditionalRenderingSagas from './conditionalRendering';
import editContainerSagas from './editActiveList';
import formDesignerSagas from './formDesigner';
import manageJsonFileSagas from './manageServiceConfiguration';
import ruleConnectionSagas from './ruleConnection';
import thirdPartyComponentSagas from './thirdPartyComponents';

function* root(): SagaIterator {
  yield fork(editContainerSagas);
  yield fork(formDesignerSagas);
  yield fork(apiSagas);
  yield fork(ruleConnectionSagas);
  yield fork(conditionalRenderingSagas);
  yield fork(appDataSagas);
  yield fork(manageJsonFileSagas);
  yield fork(codeListsSagas);
  yield fork(thirdPartyComponentSagas);
}

export const run: () => Task = () => sagaMiddleware.run(root);
