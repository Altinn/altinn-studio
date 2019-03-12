import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';
import * as WorkflowActions from '../../actions/workflowActions/actions';
import WorkflowActionDispatcher from '../../actions/workflowActions/worflowActionDispatcher';
import * as WorkflowActionTypes from '../../actions/workflowActions/workflowActionTypes';
import { WorkflowSteps } from '../../containers/WorkflowStep';
import { get } from '../../utils/networking';

function* getCurrentStateSaga({ url }: WorkflowActions.IGetCurrentState): SagaIterator {
  try {
    const result = yield call(get, url);
    yield call(WorkflowActionDispatcher.getCurrentStateFulfilled, result.state ? result.state : WorkflowSteps.Unknown);
  } catch (err) {
    yield call(WorkflowActionDispatcher.getCurrentStateRejected, err);
  }
}

export function* watchGetCurrentStateSaga(): SagaIterator {
  yield takeLatest(WorkflowActionTypes.GET_CURRENT_STATE, getCurrentStateSaga);
}
