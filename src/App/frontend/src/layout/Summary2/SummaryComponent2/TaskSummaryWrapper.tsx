import React from 'react';

import { TaskOverrides } from 'src/core/contexts/TaskOverrides';
import { FormProvider } from 'src/features/form/FormContext';
import { getUiFolderSettings } from 'src/features/form/ui';
import { useNavigationParam } from 'src/hooks/navigation';

interface TaskSummaryProps {
  taskId?: string;
  targetId?: string;
  type?: string;
}

export function TaskSummaryWrapper({ taskId, children }: React.PropsWithChildren<TaskSummaryProps>) {
  const currentTaskId = useNavigationParam('taskId');
  const uiFolderSettings = taskId ? getUiFolderSettings(taskId) : undefined;

  if (!taskId || taskId === currentTaskId || !uiFolderSettings) {
    return children;
  }

  return (
    <TaskOverrides
      taskId={taskId}
      uiFolder={taskId}
      dataModelType={uiFolderSettings.defaultDataType}
    >
      <FormProvider readOnly={true}>{children}</FormProvider>
    </TaskOverrides>
  );
}
