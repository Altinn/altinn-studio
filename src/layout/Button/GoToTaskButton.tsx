import React from 'react';

import { ProcessActions } from 'src/features/process/processSlice';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { useCanSubmitForm } from 'src/hooks/useCanSubmitForm';
import { WrappedButton } from 'src/layout/Button/WrappedButton';
import type { IButtonProvidedProps } from 'src/layout/Button/ButtonComponent';

export const GoToTaskButton = ({ children, ...props }: React.PropsWithChildren<IButtonProvidedProps>) => {
  const dispatch = useAppDispatch();
  const { canSubmit, busyWithId, message } = useCanSubmitForm();
  const taskId = props.node.isType('Button') ? props.node.item.taskId : undefined;
  const availableProcessTasks = useAppSelector((state) => state.process.availableNextTasks);
  const canGoToTask = canSubmit && availableProcessTasks && availableProcessTasks.includes(taskId || '');
  const navigateToTask = () => {
    if (canGoToTask) {
      dispatch(
        ProcessActions.complete({
          taskId,
        }),
      );
    }
  };

  return (
    <WrappedButton
      disabled={!canGoToTask}
      busyWithId={busyWithId}
      message={message}
      onClick={navigateToTask}
      {...props}
      variant={'secondary'}
    >
      {children}
    </WrappedButton>
  );
};
