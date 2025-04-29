import { useTaskNavigationGroupQuery } from 'app-shared/hooks/queries/useTaskNavigationGroupQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { TaskNavigationGroup } from 'app-shared/types/api/dto/TaskNavigationGroup';
import { StudioAlert, StudioSpinner } from '@studio/components-legacy';
import React, { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { isTaskReceipt, getTaskIcon, taskNavigationType } from '../SettingsUtils';
import { PadlockLockedFillIcon } from '@studio/icons';
import classes from './SettingsNavigation.module.css';

export const SettingsNavigation = (): ReactElement => {
  const { t } = useTranslation();

  const { org, app } = useStudioEnvironmentParams();
  const { data: taskNavigationGroups, isPending } = useTaskNavigationGroupQuery(org, app);

  if (isPending)
    return <StudioSpinner spinnerTitle={t('ux_editor.settings.navigation_tab_loading')} />;

  if (!taskNavigationGroups?.length)
    return (
      <StudioAlert className={classes.warningMessage} severity='warning'>
        {t('ux_editor.settings.navigation_warning')}
      </StudioAlert>
    );

  return (
    <div className={classes.taskNavigationContainer}>
      {taskNavigationGroups.map((task: TaskNavigationGroup, key: number) => (
        <TaskNavigation key={`${task.taskType}-${key}`} taskType={task.taskType} />
      ))}
    </div>
  );
};

type TaskNavigationProps = {
  taskType: string;
};

const TaskNavigation = ({ taskType }: TaskNavigationProps): ReactElement => {
  const { t } = useTranslation();

  const TaskIcon = getTaskIcon(taskType);
  const taskTypeName = taskNavigationType(taskType);

  return (
    <div className={classes.taskWrapper}>
      <div className={classes.taskContent}>
        <TaskIcon className={classes.taskIcon} />
        <span className={classes.taskTypeName}>{t(taskTypeName)}</span>
      </div>
      {isTaskReceipt(taskType) && (
        <PadlockLockedFillIcon data-testid='lockerIcon' className={classes.taskIconLocker} />
      )}
    </div>
  );
};
