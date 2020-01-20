import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import {
  watchFetchJsonFileSaga, watchSaveJsonFileSaga,
} from './manageServiceConfigurationSagas';

export default function*(): SagaIterator {
  yield fork(watchFetchJsonFileSaga);
  yield fork(watchSaveJsonFileSaga);
}
