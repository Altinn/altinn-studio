import { call, put } from 'redux-saga/effects';
import type { SagaIterator } from 'redux-saga';

import { ProcessActions } from 'src/shared/resources/process/processSlice';
import { ProcessTaskType } from 'src/types';
import { getProcessStateUrl } from 'src/utils/appUrlHelper';

import { get } from 'altinn-shared/utils';
import type { IProcess } from 'altinn-shared/types';

export function* getProcessStateSaga(): SagaIterator {
  try {
    const processState: IProcess = yield call(get, getProcessStateUrl());
    if (!processState) {
      yield put(
        ProcessActions.getFulfilled({
          processStep: ProcessTaskType.Unknown,
          taskId: null,
        }),
      );
    } else if (processState.ended) {
      yield put(
        ProcessActions.getFulfilled({
          processStep: ProcessTaskType.Archived,
          taskId: null,
        }),
      );
    } else {
      yield put(
        ProcessActions.getFulfilled({
          processStep: processState.currentTask
            .altinnTaskType as ProcessTaskType,
          taskId: processState.currentTask.elementId,
        }),
      );
    }
  } catch (error) {
    yield put(ProcessActions.getRejected({ error }));
  }
}
