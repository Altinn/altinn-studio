import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';
import { get } from '../../../../utils/networking';
import FormDynamicsActions from '../formDynamicsActions';
import { IFetchServiceConfig } from './fetchFormDynamicsActions';
import * as FormDynamicsActionTypes from '../formDynamicsActionTypes';

function* fetchDynamicsSaga({ url }: IFetchServiceConfig): SagaIterator {
  try {
    const { data }: any = yield call(get, url);
    yield call(
      FormDynamicsActions.fetchFormDynamicsFulfilled,
      data.APIs,
      data.ruleConnection,
      data.conditionalRendering,
    );
  } catch (err) {
    yield call(FormDynamicsActions.fetchFormDynamicsRejected, err);
  }
}

export function* watchFetchDynamics(): SagaIterator {
  yield takeLatest(FormDynamicsActionTypes.FETCH_SERVICE_CONFIG, fetchDynamicsSaga);
}
