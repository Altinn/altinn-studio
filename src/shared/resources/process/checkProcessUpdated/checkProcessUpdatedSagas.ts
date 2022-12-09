import { call, delay, put, select } from 'redux-saga/effects';
import type { SagaIterator } from 'redux-saga';

import { ProcessActions } from 'src/shared/resources/process/processSlice';
import { ProcessTaskType } from 'src/types';
import { get } from 'src/utils/sharedUtils';
import { getProcessStateUrl } from 'src/utils/urls/appUrlHelper';
import type { IProcessState } from 'src/shared/resources/process';
import type { IRuntimeState } from 'src/types';
import type { IProcess } from 'src/types/shared';

const processSelector = (state: IRuntimeState): IProcessState => state.process;

export function* getUpdatedProcess(): SagaIterator {
  const currentProcessState: IProcessState = yield select(processSelector);
  let delayBy = 1000;
  for (let i = 0; i < 20; i++) {
    const result: IProcess = yield call(get, getProcessStateUrl());
    if (!result) {
      throw new Error('Error: no process returned.');
    }

    if (result.ended) {
      return {
        state: ProcessTaskType.Archived,
        taskId: null,
      };
    }

    if (result.currentTask?.altinnTaskType !== currentProcessState.taskType) {
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
