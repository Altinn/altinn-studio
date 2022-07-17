import type { SagaIterator } from 'redux-saga';
import { call, put } from 'redux-saga/effects';
import { get } from 'altinn-shared/utils';
import type { IProcess } from 'altinn-shared/types';
import { ProcessTaskType } from '../../../../types';
import { getProcessStateUrl } from '../../../../utils/appUrlHelper';
import { ProcessActions } from 'src/shared/resources/process/processSlice';

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
