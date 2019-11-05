import { SagaIterator } from 'redux-saga';
import { call, fork, takeLatest } from 'redux-saga/effects';
import { get} from '../../../../../shared/src/utils/networking';
import { getProcessStateUrl } from '../../../utils/urlHelper';
import * as ProcessStateActionTypes from '../processActionTypes';
import ProcessStateDispatchers from '../processDispatcher';

export function* getProcessStateSaga(): SagaIterator {
  try {
    const result = yield call(get, getProcessStateUrl());
    if (!!!result) {
      const unknwonResult = {currentTask: {name: 'Unknown'}};
      yield call(ProcessStateDispatchers.getProcessStateFulfilled, unknwonResult);
    } else {
      yield call(ProcessStateDispatchers.getProcessStateFulfilled, result);
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
