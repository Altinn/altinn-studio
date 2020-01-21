import { SagaIterator } from 'redux-saga';
import { call, fork, takeLatest } from 'redux-saga/effects';
import { get } from 'altinn-shared/utils';
import { ProcessSteps } from '../../../../types';
import { getProcessStateUrl } from '../../../../utils/urlHelper';
import * as ProcessStateActionTypes from '../processActionTypes';
import ProcessStateDispatchers from '../processDispatcher';

export function* getProcessStateSaga(): SagaIterator {
  try {
    const processState: any = yield call(get, getProcessStateUrl());
    if (!processState) {
      yield call(ProcessStateDispatchers.getProcessStateFulfilled, ProcessSteps.Unknown);
    } else {
      if (processState.ended) {
        yield call(ProcessStateDispatchers.getProcessStateFulfilled, ProcessSteps.Archived);
      } else {
        yield call(ProcessStateDispatchers.getProcessStateFulfilled, ProcessSteps.FormFilling);
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
