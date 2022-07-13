import type { SagaIterator } from 'redux-saga';
import { call, delay, takeLatest, select, put } from 'redux-saga/effects';
import { get } from 'altinn-shared/utils';
import type { IProcess } from 'altinn-shared/types';
import type { IRuntimeState } from '../../../../types';
import { ProcessTaskType } from '../../../../types';
import { getProcessStateUrl } from '../../../../utils/appUrlHelper';
import type { IProcessState } from '../';
import { ProcessActions } from 'src/shared/resources/process/processSlice';

const processSelector = (state: IRuntimeState): IProcessState => state.process;

export function* getUpdatedProcess(): SagaIterator {
  const currentProcessState: IProcessState = yield select(processSelector);
  let delayBy = 1000;
  for (let i = 0; i < 20; i++) {
    const result: IProcess = yield call(get, getProcessStateUrl(), null);
    if (!result) {
      throw new Error('Error: no process returned.');
    }

    if (result.ended) {
      return {
        state: ProcessTaskType.Archived,
        taskId: null,
      };
    }

    if (result.currentTask.altinnTaskType !== currentProcessState.taskType) {
      return {
        state: currentProcessState.taskType,
        taskId: currentProcessState.taskId,
      };
    }

    if (i < 10) {
      yield delay(delayBy);
    } else if (i >= 10 && i < 20) {
      delayBy *= 2;
      yield delay(delayBy);
    }
  }

  return {
    state: currentProcessState.taskType,
    taskId: currentProcessState.taskId,
  };
}

export function* checkProcessUpdated(): SagaIterator {
  try {
    const process = yield call(getUpdatedProcess);
    yield put(
      ProcessActions.getFulfilled({
        processStep: process.state,
        taskId: process.taskId,
      }),
    );
  } catch (error) {
    yield put(ProcessActions.getRejected({ error }));
  }
}

export function* watchCheckProcessUpdatedSaga(): SagaIterator {
  yield takeLatest(ProcessActions.checkIfUpdated, checkProcessUpdated);
}
