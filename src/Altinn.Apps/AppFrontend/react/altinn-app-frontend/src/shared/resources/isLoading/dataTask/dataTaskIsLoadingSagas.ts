import { SagaIterator } from 'redux-saga';
import { all, put, take } from 'redux-saga/effects';
import FormDataActions from '../../../../features/form/data/formDataActions';
import { FormLayoutActions } from '../../../../features/form/layout/formLayoutSlice';
import { FETCH_RULE_MODEL_FULFILLED } from '../../../../features/form/rules/rulesActionTypes';
import { FETCH_SERVICE_CONFIG_FULFILLED } from '../../../../features/form/dynamics/formDynamicsActionTypes';
import { finishDataTaskIsLoading } from '../isLoadingSlice';
import { startInitialDataTaskQueue } from '../../queue/queueSlice';

export function* watcherFinishDataTaskIsloadingSaga(): SagaIterator {
  while (true) {
    yield take(startInitialDataTaskQueue);
    yield all([
      take(FormDataActions.fetchFormDataFulfilled),
      take(FormLayoutActions.fetchLayoutFulfilled),
      take(FormLayoutActions.fetchLayoutSettingsFulfilled),
      take(FETCH_RULE_MODEL_FULFILLED),
      take(FETCH_SERVICE_CONFIG_FULFILLED),
    ]);

    yield put(finishDataTaskIsLoading());
  }
}
