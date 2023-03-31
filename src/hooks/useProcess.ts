import React from 'react';

import { IsLoadingActions } from 'src/features/isLoading/isLoadingSlice';
import { ProcessActions } from 'src/features/process/processSlice';
import { QueueActions } from 'src/features/queue/queueSlice';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { selectAppName, selectAppOwner } from 'src/selectors/language';
import { ProcessTaskType } from 'src/types';
import { behavesLikeDataTask } from 'src/utils/formLayout';

export function useProcess() {
  const dispatch = useAppDispatch();

  const instanceData = useAppSelector((state) => state.instanceData.instance);
  const applicationMetadata = useAppSelector((state) => state.applicationMetadata.applicationMetadata);
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

    if (taskType === ProcessTaskType.Data || behavesLikeDataTask(taskId, layoutSets)) {
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
  }, [taskType, taskId, applicationMetadata, instanceData, dispatch, layoutSets]);

  const appName = useAppSelector(selectAppName);
  const appOwner = useAppSelector(selectAppOwner);
  return { dispatch, process, appOwner, appName };
}
