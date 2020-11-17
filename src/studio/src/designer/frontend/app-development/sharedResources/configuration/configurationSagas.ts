import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import getEnvironmentsSagas from './getEnvironments/getEnvironmentsSagas';
import watchGetOrgsSaga from './getOrgs/getOrgsSagas';

// eslint-disable-next-line import/prefer-default-export
export function* configurationSagas(): SagaIterator {
  yield fork(getEnvironmentsSagas);
  yield fork(watchGetOrgsSaga);
}
