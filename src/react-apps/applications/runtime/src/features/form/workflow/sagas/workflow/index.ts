import { SagaIterator } from 'redux-saga';
import {
  call,
  takeLatest,
} from 'redux-saga/effects';

import Actions from '../../actions'
import * as ActionTypes from '../../actions/types';
import {
  IGetCurrentState,
  ISetCurrentState,
} from '../../actions/workflowState';

import {
  get,
  post,
} from '../../../../../utils/networking';

function* getCurrentStateSaga({ url }: IGetCurrentState): SagaIterator {
  try {
    const workflowState = yield call(get, url);

    yield call(Actions.getCurrentStateFulfilled, workflowState.state);
  } catch (err) {
    yield call(Actions.getCurrentStateRejected, err);
  }
}

export function* watchGetCurrentStateSaga(): SagaIterator {
  yield takeLatest(ActionTypes.GET_CURRENT_STATE, getCurrentStateSaga);
}

function* setCurrentStateSaga({ url, state }: ISetCurrentState): SagaIterator {
  try {
    //  yield call(post, url, state);
    yield call(Actions.setCurrentStateFullfilled);
  } catch (err) {
    yield call(
      Actions.setCurrentStateRejected,
      err,
    );
  }
}

export function* watchSetCurrentStateSaga(): SagaIterator {
  yield takeLatest(ActionTypes.SET_CURRENT_STATE, setCurrentStateSaga);
}
