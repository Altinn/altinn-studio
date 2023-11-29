import React from 'react';

import { useProcessNavigation } from 'src/features/instance/ProcessNavigationContext';
import { useProcessNextTasks } from 'src/features/instance/useProcessNextTasks';
import { useLanguage } from 'src/features/language/useLanguage';
import { WrappedButton } from 'src/layout/Button/WrappedButton';
import type { IButtonProvidedProps } from 'src/layout/Button/ButtonComponent';

export const GoToTaskButton = ({ children, ...props }: React.PropsWithChildren<IButtonProvidedProps>) => {
  const { langAsString } = useLanguage();
  const taskId = props.node.isType('Button') ? props.node.item.taskId : undefined;
  const availableProcessTasks = useProcessNextTasks();
  const { next, canSubmit, busyWithId, attachmentsPending } = useProcessNavigation() || {};
  const canGoToTask = canSubmit && availableProcessTasks.includes(taskId || '');
  const navigateToTask = () => {
    if (canGoToTask && next) {
      next({ taskId, nodeId: props.node.item.id });
    }
  };

  return (
    <WrappedButton
      disabled={!canGoToTask}
      busyWithId={busyWithId}
      message={attachmentsPending ? langAsString('general.wait_for_attachments') : undefined}
      onClick={navigateToTask}
      nodeId={props.node.item.id}
      {...props}
      variant={'secondary'}
    >
      {children}
    </WrappedButton>
  );
};
