import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchUpdateConditionalRenderingConnectedIdsSaga } from './conditionalRendering/conditionalRenderingSagas';
import { watchFetchServiceConfigurationSaga, watchSaveServiceConfigurationSaga } from './manageServiceConfigurations/manageServiceConfigurationSagas';

export default function* serviceConfigurationSagas(): SagaIterator {
  yield fork(watchFetchServiceConfigurationSaga);
  yield fork(watchSaveServiceConfigurationSaga);
  yield fork(watchUpdateConditionalRenderingConnectedIdsSaga);
}
