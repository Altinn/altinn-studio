import React from 'react';

import { ButtonVariant } from '@altinn/altinn-design-system';

import { useAppDispatch, useAppSelector } from 'src/common/hooks';
import { WrappedButton } from 'src/components/base/ButtonComponent/WrappedButton';
import { ProcessActions } from 'src/shared/resources/process/processSlice';
import { ProcessTaskType } from 'src/types';
import type { ButtonProps } from 'src/components/base/ButtonComponent/WrappedButton';

export type Props = Omit<ButtonProps, 'onClick'> & { taskId: string };

export const GoToTaskButton = ({ children, taskId, ...props }: Props) => {
  const dispatch = useAppDispatch();
  const availableProcessTasks = useAppSelector((state) => state.process.availableNextTasks);
  const canGoToTask = availableProcessTasks && availableProcessTasks.includes(taskId);
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
      variant={ButtonVariant.Secondary}
    >
      {children}
    </WrappedButton>
  );
};
