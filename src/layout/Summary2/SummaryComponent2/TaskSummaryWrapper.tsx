import React, { useEffect } from 'react';

import { useTaskStore } from 'src/core/contexts/taskStoreContext';
import { FormProvider } from 'src/features/form/FormContext';
import { useLayoutSets } from 'src/features/form/layoutSets/LayoutSetsProvider';
import { useNavigationParam } from 'src/hooks/navigation';

interface TaskSummaryProps {
  taskId?: string;
  targetId?: string;
  type?: string;
}

export function TaskSummaryWrapper({ taskId, children }: React.PropsWithChildren<TaskSummaryProps>) {
  const setTaskId = useTaskStore((state) => state.setTaskId);
  const setOverriddenDataModelType = useTaskStore((state) => state.setOverriddenDataModelType);
  const setOverriddenDataModelDataElementId = useTaskStore((state) => state.setOverriddenDataModelDataElementId);
  const setOverriddenLayoutSetId = useTaskStore((state) => state.setOverriddenLayoutSetId);

  const currentTaskId = useNavigationParam('taskId');
  const overriddenTaskId = useTaskStore((state) => state.overriddenTaskId);
  const notCurrentTask = overriddenTaskId && overriddenTaskId !== currentTaskId;

  const layoutSets = useLayoutSets();

  useEffect(() => {
    if (taskId) {
      const layoutSetForTask = layoutSets.find((set) => set.tasks?.includes(taskId));
      setTaskId && setTaskId(taskId);
      if (layoutSetForTask) {
        setOverriddenDataModelType && setOverriddenDataModelType(layoutSetForTask.dataType);
        setOverriddenLayoutSetId && setOverriddenLayoutSetId(layoutSetForTask.id);
      }
    }
  }, [
    layoutSets,
    setOverriddenDataModelType,
    setOverriddenDataModelDataElementId,
    setOverriddenLayoutSetId,
    setTaskId,
    taskId,
  ]);

  if (taskId && overriddenTaskId !== taskId) {
    // Wait for the task to be set correctly
    return null;
  }

  if (notCurrentTask) {
    return <FormProvider readOnly={true}>{children}</FormProvider>;
  }

  return children;
}
