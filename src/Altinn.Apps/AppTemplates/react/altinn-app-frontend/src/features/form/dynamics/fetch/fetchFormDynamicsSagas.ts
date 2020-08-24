import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';
import { get } from '../../../../utils/networking';
import FormDynamicsActions from '../formDynamicsActions';
import { IFetchServiceConfig } from './fetchFormDynamicsActions';
import * as FormDynamicsActionTypes from '../formDynamicsActionTypes';
import QueueActions from '../../../../shared/resources/queue/queueActions';

function* fetchDynamicsSaga({ url }: IFetchServiceConfig): SagaIterator {
  try {
    const result: any = yield call(get, url);
    const data = result ? result.data : {};

    yield call(
      FormDynamicsActions.fetchFormDynamicsFulfilled,
      data.APIs,
      data.ruleConnection,
      data.conditionalRendering,
    );
  } catch (err) {
    yield call(FormDynamicsActions.fetchFormDynamicsRejected, err);
    yield call(QueueActions.dataTaskQueueError, err);
  }
}

export function* watchFetchDynamics(): SagaIterator {
  yield takeLatest(FormDynamicsActionTypes.FETCH_SERVICE_CONFIG, fetchDynamicsSaga);
}
