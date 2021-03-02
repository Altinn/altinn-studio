import { SagaIterator } from 'redux-saga';
import { all, call, take } from 'redux-saga/effects';
import { FETCH_FORM_DATA_FULFILLED } from '../../../../features/form/data/formDataActionTypes';
import { FETCH_FORM_LAYOUT_FULFILLED, FETCH_FORM_LAYOUT_SETTINGS_FULFILLED } from '../../../../features/form/layout/formLayoutActionTypes';
import { FETCH_RULE_MODEL_FULFILLED } from '../../../../features/form/rules/rulesActionTypes';
import { FETCH_SERVICE_CONFIG_FULFILLED } from '../../../../features/form/dynamics/formDynamicsActionTypes';
import IsLoadingActions from '../isLoadingActions';
import { START_INITIAL_DATA_TASK_QUEUE } from '../../queue/dataTask/dataTaskQueueActionTypes';

export function* watcherFinishDataTaskIsloadingSaga(): SagaIterator {
  while (true) {
    yield take(START_INITIAL_DATA_TASK_QUEUE);
    yield all([
      take(FETCH_FORM_DATA_FULFILLED),
      take(FETCH_FORM_LAYOUT_FULFILLED),
      take(FETCH_FORM_LAYOUT_SETTINGS_FULFILLED),
      take(FETCH_RULE_MODEL_FULFILLED),
      take(FETCH_SERVICE_CONFIG_FULFILLED),
    ]);

    yield call(IsLoadingActions.finishDataTaskIsloading);
  }
}
