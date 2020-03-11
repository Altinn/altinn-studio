import { SagaIterator } from 'redux-saga';
import { call, fork, takeLatest } from 'redux-saga/effects';
import { get } from 'altinn-shared/utils';
import { ProcessSteps } from '../../../../types';
import { getProcessStateUrl } from '../../../../utils/urlHelper';
import * as ProcessStateActionTypes from '../processActionTypes';
import ProcessStateDispatchers from '../processDispatcher';
import { IProcess } from 'altinn-shared/types';

export function* getProcessStateSaga(): SagaIterator {
  try {
    const processState: IProcess = yield call(get, getProcessStateUrl());
    if (!processState) {
      yield call(ProcessStateDispatchers.getProcessStateFulfilled, ProcessSteps.Unknown);
    } else {
      
      if (processState.ended) {
        yield call(ProcessStateDispatchers.getProcessStateFulfilled, ProcessSteps.Archived);
      } else if (processState.currentTask.altinnTaskType === 'data') {
        yield call(ProcessStateDispatchers.getProcessStateFulfilled, ProcessSteps.FormFilling);
      } else if (processState.currentTask.altinnTaskType === 'confirmation') {
        yield call(ProcessStateDispatchers.getProcessStateFulfilled, ProcessSteps.Confirm);
      }
    }
  } catch (err) {
    yield call(ProcessStateDispatchers.getProcessStateRejected, err);
  }
}

export function* watchGetProcessStateSaga(): SagaIterator {
  yield takeLatest(
    ProcessStateActionTypes.GET_PROCESS_STATE,
    getProcessStateSaga,
  );
}

// WATCHES EXPORT
export function* processStateSagas(): SagaIterator {
  yield fork(watchGetProcessStateSaga);
  // Insert all watchSagas here
}
