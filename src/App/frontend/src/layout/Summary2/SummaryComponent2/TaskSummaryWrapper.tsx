import React from 'react';

import { TaskOverrides } from 'src/core/contexts/TaskOverrides';
import { FormProvider } from 'src/features/form/FormContext';
import { getLayoutSets } from 'src/features/layoutSets';
import { useNavigationParam } from 'src/hooks/navigation';

interface TaskSummaryProps {
  taskId?: string;
  targetId?: string;
  type?: string;
}

export function TaskSummaryWrapper({ taskId, children }: React.PropsWithChildren<TaskSummaryProps>) {
  const currentTaskId = useNavigationParam('taskId');
  const layoutSets = getLayoutSets();
  const layoutSetForTask = taskId ? layoutSets.find((set) => set.tasks?.includes(taskId)) : undefined;

  return (
    <TaskOverrides
      taskId={taskId}
      dataModelType={layoutSetForTask?.dataType}
      layoutSetId={layoutSetForTask?.id}
    >
      {taskId && taskId !== currentTaskId ? <FormProvider readOnly={true}>{children}</FormProvider> : children}
    </TaskOverrides>
  );
}
