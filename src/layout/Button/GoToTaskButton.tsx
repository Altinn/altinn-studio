import React from 'react';

import { ButtonVariant } from '@digdir/design-system-react';

import { useAppDispatch } from 'src/common/hooks/useAppDispatch';
import { useAppSelector } from 'src/common/hooks/useAppSelector';
import { WrappedButton } from 'src/layout/Button/WrappedButton';
import { ProcessActions } from 'src/shared/resources/process/processSlice';
import { ProcessTaskType } from 'src/types';
import type { IButtonProvidedProps } from 'src/layout/Button/ButtonComponent';

export const GoToTaskButton = ({ children, ...props }: React.PropsWithChildren<IButtonProvidedProps>) => {
  const dispatch = useAppDispatch();
  const taskId = props.node.isType('Button') ? props.node.item.taskId : undefined;
  const availableProcessTasks = useAppSelector((state) => state.process.availableNextTasks);
  const canGoToTask = availableProcessTasks && availableProcessTasks.includes(taskId || '');
  const navigateToTask = () => {
    if (canGoToTask) {
      dispatch(
        ProcessActions.complete({
          taskId,
          processStep: ProcessTaskType.Unknown,
        }),
      );
    }
  };
  return (
    <WrappedButton
      disabled={!canGoToTask}
      onClick={navigateToTask}
      {...props}
      variant={ButtonVariant.Outline}
    >
      {children}
    </WrappedButton>
  );
};
