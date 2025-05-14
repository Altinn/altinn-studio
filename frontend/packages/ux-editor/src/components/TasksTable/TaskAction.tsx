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

type TaskActionProps = {
  task: TaskNavigationGroup;
  tasks: TaskNavigationGroup[];
  index: number;
  isNavigationMode: boolean;
};

export const TaskAction = ({ task, tasks, index, isNavigationMode }: TaskActionProps) => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { mutate } = useTaskNavigationGroupMutation(org, app);

  if (!isNavigationMode) {
    return (
      <StudioButton variant='tertiary' icon={<EyeIcon />} onClick={() => {}}>
        {t('ux_editor.task_table_display')}
      </StudioButton>
    );
  }

  const handleHideNavigationTask = () => {
    const updatedNavigationTasks = tasks.filter(
      (navigationTask) => navigationTask.taskId !== task.taskId,
    );
    mutate(updatedNavigationTasks);
  };

  return (
    <StudioPopover.TriggerContext>
      <StudioPopover.Trigger variant='tertiary'>
        <MenuElipsisVerticalIcon />
      </StudioPopover.Trigger>
      <StudioPopover placement='right'>
        <div className={classes.ellipsisMenuContent}>
          <StudioButton variant='tertiary' onClick={() => {}} icon={<ArrowUpIcon />}>
            {t('ux_editor.task_table.menu_task_up')}
          </StudioButton>
          <StudioButton variant='tertiary' onClick={() => {}} icon={<ArrowDownIcon />}>
            {t('ux_editor.task_table.menu_task_down')}
          </StudioButton>
          <StudioDivider className={classes.divider} />
          <StudioButton
            variant='tertiary'
            onClick={handleHideNavigationTask}
            icon={<EyeClosedIcon />}
          >
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
