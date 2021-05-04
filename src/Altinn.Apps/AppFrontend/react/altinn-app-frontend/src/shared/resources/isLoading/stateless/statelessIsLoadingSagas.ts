import { SagaIterator } from 'redux-saga';
import { take, all, put } from 'redux-saga/effects';
import FormDataActions from 'src/features/form/data/formDataActions';
import { FETCH_SERVICE_CONFIG_FULFILLED } from 'src/features/form/dynamics/formDynamicsActionTypes';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { FETCH_RULE_MODEL_FULFILLED } from 'src/features/form/rules/rulesActionTypes';
import { startInitialStatelessQueue } from '../../queue/queueSlice';
import { finishStatlessIsLoading } from '../isLoadingSlice';

export function* watcherFinishStatlessIsLoadingSaga(): SagaIterator {
  yield take(startInitialStatelessQueue);
  yield all([
    take(FormDataActions.fetchFormDataFulfilled),
    take(FormLayoutActions.fetchLayoutFulfilled),
    take(FormLayoutActions.fetchLayoutSettingsFulfilled),
    take(FETCH_RULE_MODEL_FULFILLED),
    take(FETCH_SERVICE_CONFIG_FULFILLED),
  ]);
  yield put(finishStatlessIsLoading());
}
