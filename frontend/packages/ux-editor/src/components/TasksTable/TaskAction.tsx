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

type TaskActionProps = {
  index: number;
  isNavigationMode: boolean;
  onSelectTask: (index: number) => void;
};

export const TaskAction = ({ index, isNavigationMode, onSelectTask }: TaskActionProps) => {
  const { t } = useTranslation();

  if (!isNavigationMode) {
    return (
      <StudioButton variant='tertiary' icon={<EyeIcon />} onClick={() => onSelectTask(index)}>
        {t('ux_editor.task_table_display')}
      </StudioButton>
    );
  }

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
          <StudioButton variant='tertiary' onClick={() => {}} icon={<EyeClosedIcon />}>
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
