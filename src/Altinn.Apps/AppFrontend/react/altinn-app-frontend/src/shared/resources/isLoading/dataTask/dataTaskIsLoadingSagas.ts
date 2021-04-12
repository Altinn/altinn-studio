import { SagaIterator } from 'redux-saga';
import { all, call, take } from 'redux-saga/effects';
import FormDataActions from '../../../../features/form/data/formDataActions';
import { FormLayoutActions } from '../../../../features/form/layout/formLayoutSlice';
import { FETCH_RULE_MODEL_FULFILLED } from '../../../../features/form/rules/rulesActionTypes';
import { FETCH_SERVICE_CONFIG_FULFILLED } from '../../../../features/form/dynamics/formDynamicsActionTypes';
import IsLoadingActions from '../isLoadingActions';
import { START_INITIAL_DATA_TASK_QUEUE } from '../../queue/dataTask/dataTaskQueueActionTypes';

export function* watcherFinishDataTaskIsloadingSaga(): SagaIterator {
  while (true) {
    yield take(START_INITIAL_DATA_TASK_QUEUE);
    yield all([
      take(FormDataActions.fetchFormDataFulfilled),
      take(FormLayoutActions.fetchLayoutFulfilled),
      take(FormLayoutActions.fetchLayoutSettingsFulfilled),
      take(FETCH_RULE_MODEL_FULFILLED),
      take(FETCH_SERVICE_CONFIG_FULFILLED),
    ]);

    yield call(IsLoadingActions.finishDataTaskIsloading);
  }
}
