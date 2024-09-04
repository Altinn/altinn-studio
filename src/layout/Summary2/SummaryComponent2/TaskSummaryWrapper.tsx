import React, { useEffect } from 'react';

import { FormProvider } from 'src/features/form/FormContext';
import { useLayoutSets } from 'src/features/form/layoutSets/LayoutSetsProvider';
import { useTaskStore } from 'src/layout/Summary2/taskIdStore';

interface TaskSummaryProps {
  taskId?: string;
  targetId?: string;
  type?: string;
}

export function TaskSummaryWrapper({ taskId, children }: React.PropsWithChildren<TaskSummaryProps>) {
  const { setTaskId, setOverriddenDataModelId, setOverriddenLayoutSetId, overriddenTaskId } = useTaskStore((state) => ({
    setTaskId: state.setTaskId,
    setOverriddenDataModelId: state.setOverriddenDataModelId,
    setOverriddenLayoutSetId: state.setOverriddenLayoutSetId,
    overriddenTaskId: state.overriddenTaskId,
  }));

  const layoutSets = useLayoutSets();

  useEffect(() => {
    if (taskId) {
      const layoutSetForTask = layoutSets.sets.find((set) => set.tasks?.includes(taskId));
      setTaskId && setTaskId(taskId);
      if (layoutSetForTask) {
        setOverriddenDataModelId && setOverriddenDataModelId(layoutSetForTask.dataType);
        setOverriddenLayoutSetId && setOverriddenLayoutSetId(layoutSetForTask.id);
      }
    }
  }, [layoutSets.sets, setOverriddenDataModelId, setOverriddenLayoutSetId, setTaskId, taskId]);

  if (overriddenTaskId) {
    return <FormProvider>{children}</FormProvider>;
  }
  return <>{children}</>;
}
