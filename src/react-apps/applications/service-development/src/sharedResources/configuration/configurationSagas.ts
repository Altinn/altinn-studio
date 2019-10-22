import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import getEnvironmentsSagas from './getEnvironments/getEnvironmentsSagas';

export function* configurationSagas(): SagaIterator {
  yield fork(getEnvironmentsSagas);
}
