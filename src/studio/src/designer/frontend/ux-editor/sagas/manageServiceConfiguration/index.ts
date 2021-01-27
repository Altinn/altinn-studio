import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchFetchServiceConfigurationSaga, watchSaveJsonFileSaga } from '../../features/serviceConfigurations/manageServiceConfigurations/manageServiceConfigurationSagas';

// eslint-disable-next-line func-names
export default function* (): SagaIterator {
  yield fork(watchFetchServiceConfigurationSaga);
  yield fork(watchSaveJsonFileSaga);
}
