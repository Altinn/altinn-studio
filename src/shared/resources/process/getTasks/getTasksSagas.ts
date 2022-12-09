import { call, put } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { SagaIterator } from 'redux-saga';

import { ProcessActions } from 'src/shared/resources/process/processSlice';
import { ProcessTaskType } from 'src/types';
import { get } from 'src/utils/sharedUtils';
import { getProcessNextUrl } from 'src/utils/urls/appUrlHelper';
import type { IGetTasksFulfilled } from 'src/shared/resources/process';
import type { IProcess } from 'src/types/shared';

export function* getTasksSaga({ payload: { processStep } }: PayloadAction<IGetTasksFulfilled>): SagaIterator {
  if (processStep === ProcessTaskType.Archived) {
    yield put(
      ProcessActions.getTasksFulfilled({
        tasks: [],
      }),
    );
    return;
  }
  try {
    const result: IProcess = yield call(get, getProcessNextUrl());
    if (!result) {
      put(
        ProcessActions.getTasksRejected({
          error: new Error('Error: no process returned.'),
        }),
      );
      return;
    }
    yield put(
      ProcessActions.getTasksFulfilled({
        tasks: result as unknown as string[],
      }),
    );
  } catch (error) {
    yield put(ProcessActions.getTasksRejected({ error }));
  }
}
