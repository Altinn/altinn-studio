import React, { useEffect } from 'react';

import { useTaskStore } from 'src/core/contexts/taskStoreContext';
import { FormProvider } from 'src/features/form/FormContext';
import { useLayoutSets } from 'src/features/form/layoutSets/LayoutSetsProvider';

interface TaskSummaryProps {
  taskId?: string;
  targetId?: string;
  type?: string;
}

export function TaskSummaryWrapper({ taskId, children }: React.PropsWithChildren<TaskSummaryProps>) {
  const { setTaskId, setOverriddenDataModelUuid, setOverriddenLayoutSetId, overriddenTaskId } = useTaskStore(
    (state) => ({
      setTaskId: state.setTaskId,
      setOverriddenDataModelUuid: state.setOverriddenDataModelUuid,
      setOverriddenLayoutSetId: state.setOverriddenLayoutSetId,
      overriddenTaskId: state.overriddenTaskId,
    }),
  );

  const layoutSets = useLayoutSets();

  useEffect(() => {
    if (taskId) {
      const layoutSetForTask = layoutSets.sets.find((set) => set.tasks?.includes(taskId));
      setTaskId && setTaskId(taskId);
      if (layoutSetForTask) {
        setOverriddenDataModelUuid && setOverriddenDataModelUuid(layoutSetForTask.dataType);
        setOverriddenLayoutSetId && setOverriddenLayoutSetId(layoutSetForTask.id);
      }
    }
  }, [layoutSets.sets, setOverriddenDataModelUuid, setOverriddenLayoutSetId, setTaskId, taskId]);

  if (overriddenTaskId) {
    return <FormProvider>{children}</FormProvider>;
  }
  return <>{children}</>;
}
