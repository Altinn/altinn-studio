import { SagaIterator } from 'redux-saga';
import {
  call,
  takeLatest,
} from 'redux-saga/effects';

import Actions from '../../actions';
import * as ActionTypes from '../../actions/types';
import {
  IGetCurrentState,
  ISetCurrentState,
} from '../../actions/workflowState';

import {
  get,
  post,
} from '../../../../../utils/networking';
import { WorkflowSteps } from '../../typings';

function* getCurrentStateSaga({ url }: IGetCurrentState): SagaIterator {
  try {
    const workflowState = yield call(get, url);
    if (workflowState.state === WorkflowSteps.Archived) {
      document.body.className = 'a-bgGreenLight flex-column d-flex';
    }
    yield call(Actions.getCurrentStateFulfilled, workflowState.state);
  } catch (err) {
    yield call(Actions.getCurrentStateRejected, err);
  }
}

export function* watchGetCurrentStateSaga(): SagaIterator {
  yield takeLatest(ActionTypes.GET_CURRENT_STATE, getCurrentStateSaga);
}
