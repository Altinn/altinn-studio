import { call, put } from 'redux-saga/effects';
import type { SagaIterator } from 'redux-saga';

import { ProcessActions } from 'src/features/process/processSlice';
import { ProcessTaskType } from 'src/types';
import { httpGet } from 'src/utils/network/sharedNetworking';
import { getProcessStateUrl } from 'src/utils/urls/appUrlHelper';
import type { IProcess } from 'src/types/shared';

export function* getProcessStateSaga(): SagaIterator {
  try {
    const processState: IProcess = yield call(httpGet, getProcessStateUrl());
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
          processStep: processState.currentTask?.altinnTaskType as ProcessTaskType,
          taskId: processState.currentTask?.elementId || null,
        }),
      );
    }
  } catch (error) {
    yield put(ProcessActions.getRejected({ error }));
  }
}
