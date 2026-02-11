import React from 'react';

import { TaskOverrides } from 'src/core/contexts/TaskOverrides';
import { FormProvider } from 'src/features/form/FormContext';
import { getUiFolderSettings } from 'src/features/form/layoutSets';
import { useNavigationParam } from 'src/hooks/navigation';

interface TaskSummaryProps {
  taskId?: string;
  targetId?: string;
  type?: string;
}

export function TaskSummaryWrapper({ taskId, children }: React.PropsWithChildren<TaskSummaryProps>) {
  const currentTaskId = useNavigationParam('taskId');
  const uiFolderSettings = taskId ? getUiFolderSettings(taskId) : undefined;

  return (
    <TaskOverrides
      taskId={taskId}
      dataModelType={uiFolderSettings?.defaultDataType}
      layoutSetId={uiFolderSettings ? taskId : undefined}
    >
      {taskId && taskId !== currentTaskId ? <FormProvider readOnly={true}>{children}</FormProvider> : children}
    </TaskOverrides>
  );
}
