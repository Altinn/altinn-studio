import { SagaIterator, Task } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { sagaMiddleware } from './store';

import appDataSagas from './features/appData/appDataSagas';
import formDesignerSagas from './features/formDesigner/formDesignerSagas';
import serviceConfigurationSagas from './features/serviceConfigurations/serviceConfigurationSagas';
import thirdPartyComponentSagas from './features/thirdPartyComponents/thirdPartyComponentsSagas';
import widgetsSagas from './features/widgets/widgetsSagas';

function* root(): SagaIterator {
  yield fork(formDesignerSagas);
  yield fork(appDataSagas);
  yield fork(serviceConfigurationSagas);
  yield fork(thirdPartyComponentSagas);
  yield fork(widgetsSagas);
}

export const run: () => Task = () => sagaMiddleware.run(root);
