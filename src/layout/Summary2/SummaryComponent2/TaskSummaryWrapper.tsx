import React, { useEffect } from 'react';

import { useTaskStore } from 'src/core/contexts/taskStoreContext';
import { FormProvider } from 'src/features/form/FormContext';
import { useLayoutSets } from 'src/features/form/layoutSets/LayoutSetsProvider';
import { layoutSetIsDefault } from 'src/features/form/layoutSets/TypeGuards';

interface TaskSummaryProps {
  taskId?: string;
  targetId?: string;
  type?: string;
}

export function TaskSummaryWrapper({ taskId, children }: React.PropsWithChildren<TaskSummaryProps>) {
  const {
    setTaskId,
    setOverriddenDataModelType,
    setOverriddenDataModelUuid,
    setOverriddenLayoutSetId,
    overriddenTaskId,
  } = useTaskStore((state) => ({
    setTaskId: state.setTaskId,
    setOverriddenDataModelUuid: state.setOverriddenDataModelUuid,
    setOverriddenLayoutSetId: state.setOverriddenLayoutSetId,
    overriddenTaskId: state.overriddenTaskId,
    setOverriddenDataModelType: state.setOverriddenDataModelType,
  }));

  const layoutSets = useLayoutSets();

  useEffect(() => {
    if (taskId) {
      const layoutSetForTask = layoutSets.sets.find((set) => layoutSetIsDefault(set) && set.tasks?.includes(taskId));
      setTaskId && setTaskId(taskId);
      if (layoutSetForTask) {
        setOverriddenDataModelType && setOverriddenDataModelType(layoutSetForTask.dataType);
        setOverriddenLayoutSetId && setOverriddenLayoutSetId(layoutSetForTask.id);
      }
    }
  }, [
    layoutSets.sets,
    setOverriddenDataModelType,
    setOverriddenDataModelUuid,
    setOverriddenLayoutSetId,
    setTaskId,
    taskId,
  ]);

  if (overriddenTaskId) {
    return <FormProvider>{children}</FormProvider>;
  }
  return <>{children}</>;
}
