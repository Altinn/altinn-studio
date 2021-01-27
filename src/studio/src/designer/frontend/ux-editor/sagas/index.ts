import { SagaIterator, Task } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { sagaMiddleware } from '../store';

import appDataSagas from '../features/appData/appDataSagas';
import editContainerSagas from './editActiveList';
import formDesignerSagas from './formDesigner';
import serviceConfigurationSagas from '../features/serviceConfigurations/serviceConfigurationSagas';
import thirdPartyComponentSagas from './thirdPartyComponents';
import widgetsSagas from '../features/widgets/widgetsSagas';

function* root(): SagaIterator {
  yield fork(editContainerSagas);
  yield fork(formDesignerSagas);
  yield fork(appDataSagas);
  yield fork(serviceConfigurationSagas);
  yield fork(thirdPartyComponentSagas);
  yield fork(widgetsSagas);
}

export const run: () => Task = () => sagaMiddleware.run(root);
