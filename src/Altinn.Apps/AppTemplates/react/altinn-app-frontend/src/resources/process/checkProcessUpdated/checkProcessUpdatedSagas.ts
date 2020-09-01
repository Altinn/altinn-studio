import { SagaIterator } from 'redux-saga';
import { call, delay, takeLatest, select } from 'redux-saga/effects';
import { get } from 'altinn-shared/utils';
import { IProcess } from 'altinn-shared/types';
import { ProcessSteps, IRuntimeState } from '../../../types';
import { getProcessStateUrl } from '../../../utils/urlHelper';
import * as ProcessStateActionTypes from '../processActionTypes';
import ProcessDispatcher from '../processDispatcher';
import { IProcessState } from '../processReducer';

const processSelector = (state: IRuntimeState): IProcessState => state.process;

export function* getUpdatedProcess(): SagaIterator {
  try {
    const currentProcessState: IProcessState = yield select(processSelector);
    let delayBy = 1000;
    for (let i = 0; i < 20; i++) {
      const result: IProcess = yield call(get, getProcessStateUrl(), null);
      if (!result) {
        throw new Error('Error: no process returned.');
      }

      if (result.ended) {
        return ProcessSteps.Archived;
      } else {
        if (result.currentTask.altinnTaskType !== currentProcessState.state)
        {
          return currentProcessState.state;
        } else {
          if (i < 10) {
            yield delay(delayBy);
          }
          else if (i >= 10 && i < 20) {
            delayBy = 2*delayBy;
            yield delay(delayBy)
          }
        }
      }
    }

    return currentProcessState.state;
  } catch (err) {
    throw err;
  }
}

export function* checkProcessUpdated(): SagaIterator {
  try {
    const process = yield call(getUpdatedProcess);
    yield call(ProcessDispatcher.getProcessStateFulfilled, process);
  }
  catch (err) {
    yield call(ProcessDispatcher.getProcessStateRejected, err);
  } 
}

export function* watchCheckProcessUpdatedSaga(): SagaIterator {
  yield takeLatest(
    ProcessStateActionTypes.CHECK_PROCESS_UPDATED,
    checkProcessUpdated,
  );
}
