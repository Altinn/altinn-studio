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
          taskType: ProcessTaskType.Unknown,
          taskId: null,
          read: null,
          write: null,
          actions: null,
        }),
      );
    } else if (processState.ended) {
      yield put(
        ProcessActions.getFulfilled({
          taskType: ProcessTaskType.Archived,
          taskId: null,
          read: null,
          write: null,
          actions: null,
        }),
      );
    } else {
      yield put(
        ProcessActions.getFulfilled({
          taskType: processState.currentTask?.altinnTaskType as ProcessTaskType,
          taskId: processState.currentTask?.elementId || null,
          read: processState.currentTask?.read,
          write: processState.currentTask?.write,
          actions: processState.currentTask?.actions,
        }),
      );
    }
  } catch (error) {
    yield put(ProcessActions.getRejected({ error }));
  }
}
