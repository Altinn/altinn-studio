import { SagaIterator } from 'redux-saga';
import { call, fork, takeLatest } from 'redux-saga/effects';
import { put} from 'altinn-shared/utils';
import { ProcessSteps } from '../../../../types';
import { getCompleteProcessUrl } from '../../../../utils/urlHelper';
import * as ProcessStateActionTypes from '../processActionTypes';
import ProcessDispatcher from '../processDispatcher';

export function* completeProcessSaga(): SagaIterator {
  try {
    yield call(put, getCompleteProcessUrl(), null);
    yield call(ProcessDispatcher.completeProcessFulfilled, ProcessSteps.Archived);
  } catch (err) {
    yield call(ProcessDispatcher.completeProcessRejected, err);
  }
}

export function* watchCompleteProcessSaga(): SagaIterator {
  yield takeLatest(
    ProcessStateActionTypes.COMPLETE_PROCESS,
    completeProcessSaga,
  );
}

// WATCHES EXPORT
export function* processStateSagas(): SagaIterator {
  yield fork(watchCompleteProcessSaga);
  // Insert all watchSagas here
}
