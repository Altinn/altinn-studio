import type { SagaIterator } from 'redux-saga';
import { call, put as sagaPut, select } from 'redux-saga/effects';
import { put } from 'altinn-shared/utils';
import type { IProcess } from 'altinn-shared/types';
import type { IRuntimeState } from '../../../../types';
import { ProcessTaskType } from '../../../../types';
import { getCompleteProcessUrl } from '../../../../utils/appUrlHelper';
import { IsLoadingActions } from '../../isLoading/isLoadingSlice';
import { InstanceDataActions } from 'src/shared/resources/instanceData/instanceDataSlice';
import type { IInstanceDataState } from 'src/shared/resources/instanceData';
import { ProcessActions } from 'src/shared/resources/process/processSlice';

const instanceDataSelector = (state: IRuntimeState) => state.instanceData;

export function* completeProcessSaga(): SagaIterator {
  try {
    const result: IProcess = yield call(put, getCompleteProcessUrl(), null);
    if (!result) {
      throw new Error('Error: no process returned.');
    }
    if (result.ended) {
      yield sagaPut(
        ProcessActions.completeFulfilled({
          processStep: ProcessTaskType.Archived,
          taskId: null,
        }),
      );
    } else {
      yield sagaPut(
        ProcessActions.completeFulfilled({
          processStep: result.currentTask.altinnTaskType as ProcessTaskType,
          taskId: result.currentTask.elementId,
        }),
      );
      if (
        (result.currentTask.altinnTaskType as ProcessTaskType) ===
        ProcessTaskType.Data
      ) {
        yield sagaPut(IsLoadingActions.startDataTaskIsLoading());
        const instanceData: IInstanceDataState = yield select(
          instanceDataSelector,
        );
        const [instanceOwner, instanceId] = instanceData.instance.id.split('/');
        yield sagaPut(InstanceDataActions.get({ instanceOwner, instanceId }));
      }
    }
  } catch (error) {
    yield sagaPut(ProcessActions.completeRejected({ error }));
  }
}
