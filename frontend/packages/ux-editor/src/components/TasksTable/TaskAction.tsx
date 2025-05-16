import React from 'react';
import {
  MenuElipsisVerticalIcon,
  EyeIcon,
  EyeClosedIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from '@studio/icons';
import { StudioPopover, StudioButton } from '@studio/components';
import { StudioDivider } from '@studio/components-legacy';
import { useTranslation } from 'react-i18next';
import classes from './TaskAction.module.css';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useTaskNavigationGroupMutation } from '@altinn/ux-editor/hooks/mutations/useTaskNavigationGroupMutation';
import type { TaskNavigationGroup } from 'app-shared/types/api/dto/TaskNavigationGroup';

export type TaskActionProps = {
  task: TaskNavigationGroup;
  tasks: TaskNavigationGroup[];
  index: number;
  isNavigationMode: boolean;
};

enum Direction {
  Up = 'up',
  Down = 'down',
}

export const TaskAction = ({ task, tasks, index, isNavigationMode }: TaskActionProps) => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { mutate: updateTaskNavigationGroup } = useTaskNavigationGroupMutation(org, app);
  const [isOpen, setIsOpen] = React.useState(false);

  if (!isNavigationMode) {
    return (
      <StudioButton variant='tertiary' icon={<EyeIcon />} onClick={() => {}}>
        {t('ux_editor.task_table_display')}
      </StudioButton>
    );
  }

  const disableMoveUpButton = index === 0;
  const disableMoveDownButton = index === tasks.length - 1;

  const handleUpdateTaskNavigationGroup = (updatedNavigationTasks: TaskNavigationGroup[]) => {
    updateTaskNavigationGroup(updatedNavigationTasks);
    setIsOpen(false);
  };

  const moveNavigationTask = (direction: Direction) => {
    const updatedTasks = [...tasks];
    const swapIndex = direction === Direction.Up ? index - 1 : index + 1;
    [updatedTasks[index], updatedTasks[swapIndex]] = [updatedTasks[swapIndex], updatedTasks[index]];
    handleUpdateTaskNavigationGroup(updatedTasks);
  };

  const removeNavigationTask = () => {
    const updatedNavigationTasks = tasks.filter(
      (navigationTask) => navigationTask.taskId !== task.taskId,
    );
    handleUpdateTaskNavigationGroup(updatedNavigationTasks);
  };

  return (
    <StudioPopover.TriggerContext>
      <StudioPopover.Trigger variant='tertiary' onClick={() => setIsOpen(!isOpen)}>
        <MenuElipsisVerticalIcon />
      </StudioPopover.Trigger>
      <StudioPopover placement='right' open={isOpen} onClose={() => setIsOpen(false)}>
        <div className={classes.ellipsisMenuContent}>
          <StudioButton
            variant='tertiary'
            onClick={() => moveNavigationTask(Direction.Up)}
            icon={<ArrowUpIcon />}
            disabled={disableMoveUpButton}
          >
            {t('ux_editor.task_table.menu_task_up')}
          </StudioButton>
          <StudioButton
            variant='tertiary'
            onClick={() => moveNavigationTask(Direction.Down)}
            icon={<ArrowDownIcon />}
            disabled={disableMoveDownButton}
          >
            {t('ux_editor.task_table.menu_task_down')}
          </StudioButton>
          <StudioDivider className={classes.divider} />
          <StudioButton variant='tertiary' onClick={removeNavigationTask} icon={<EyeClosedIcon />}>
            {t('ux_editor.task_table.menu_task_hide')}
          </StudioButton>
          <StudioButton variant='tertiary' onClick={() => {}} icon={<ArrowRightIcon />}>
            {t('ux_editor.task_table.menu_task_redirect')}
          </StudioButton>
        </div>
      </StudioPopover>
    </StudioPopover.TriggerContext>
  );
};
