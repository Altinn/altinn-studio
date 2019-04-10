import { SagaIterator } from 'redux-saga';
import { takeLatest, call } from 'redux-saga/effects';

import FormDynamicsActions from '../../actions';
import * as FormDynamicsActionTypes from '../../actions/types';
import { IFetchServiceConfig } from '../../actions/fetch';
// import { get } from 'Shared/utils/networking';

import { serviceConfig } from './testData';

function* fetchDynamicsSaga({ url }: IFetchServiceConfig): SagaIterator {
  try {
    // const serviceConfig = yield call(get, url);
    const { APIs, ruleConnection, conditionalRendering } = serviceConfig.data;
    yield call(FormDynamicsActions.fetchFormDynamicsFulfilled, APIs, ruleConnection, conditionalRendering);
  } catch (err) {
    yield call(FormDynamicsActions.fetchFormDynamicsRejected, err);
  }
}

export function* watchFetchDynamics(): SagaIterator {
  yield takeLatest(FormDynamicsActionTypes.FETCH_SERVICE_CONFIG, fetchDynamicsSaga);
}
