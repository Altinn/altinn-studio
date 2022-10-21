import React from 'react';

import { useAppDispatch, useAppSelector } from 'src/common/hooks';
import { selectAppName, selectAppOwner } from 'src/selectors/language';
import { IsLoadingActions } from 'src/shared/resources/isLoading/isLoadingSlice';
import { ProcessActions } from 'src/shared/resources/process/processSlice';
import { QueueActions } from 'src/shared/resources/queue/queueSlice';
import { ProcessTaskType } from 'src/types';
import { behavesLikeDataTask } from 'src/utils/formLayout';

export function useProcess() {
  const dispatch = useAppDispatch();

  const instanceData = useAppSelector((state) => state.instanceData.instance);
  const applicationMetadata = useAppSelector(
    (state) => state.applicationMetadata.applicationMetadata,
  );
  const process = useAppSelector((state) => state.process);
  const layoutSets = useAppSelector((state) => state.formLayout.layoutsets);

  const taskType = process?.taskType;
  const taskId = process?.taskId;

  React.useEffect(() => {
    if (!applicationMetadata || !instanceData) {
      return;
    }

    if (!taskType) {
      dispatch(ProcessActions.get());
      return;
    }

    if (
      taskType === ProcessTaskType.Data ||
      behavesLikeDataTask(taskId, layoutSets)
    ) {
      dispatch(QueueActions.startInitialDataTaskQueue());
      return;
    }

    switch (taskType) {
      case ProcessTaskType.Confirm:
      case ProcessTaskType.Feedback:
        dispatch(QueueActions.startInitialInfoTaskQueue());
        break;
      case ProcessTaskType.Archived: {
        dispatch(IsLoadingActions.finishDataTaskIsLoading());
        break;
      }
      default:
        break;
    }
  }, [
    taskType,
    taskId,
    applicationMetadata,
    instanceData,
    dispatch,
    layoutSets,
  ]);

  const appName = useAppSelector(selectAppName);
  const appOwner = useAppSelector(selectAppOwner);
  return { dispatch, process, appOwner, appName };
}
