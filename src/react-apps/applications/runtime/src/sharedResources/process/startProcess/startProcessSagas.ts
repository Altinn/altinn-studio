import { SagaIterator } from 'redux-saga';
import { call, fork, takeLatest } from 'redux-saga/effects';
import { post} from '../../../../../shared/src/utils/networking';
import { getStartProcessUrl } from '../../../utils/urlHelper';
import * as ProcessStateActionTypes from '../processActionTypes';
import ProcessStateDispatchers from '../processDispatcher';

export function* startProcessSaga(): SagaIterator {
  try {
    const result = yield call(post, getStartProcessUrl());
    yield call(ProcessStateDispatchers.startProcessFulfilled, result);
  } catch (err) {
    yield call(ProcessStateDispatchers.getProcessStateRejected, err);
  }
}

export function* watchStartProcessSaga(): SagaIterator {
  yield takeLatest(
    ProcessStateActionTypes.START_PROCESS,
    startProcessSaga,
  );
}

// WATCHES EXPORT
export function* processStateSagas(): SagaIterator {
  yield fork(watchStartProcessSaga);
  // Insert all watchSagas here
}
