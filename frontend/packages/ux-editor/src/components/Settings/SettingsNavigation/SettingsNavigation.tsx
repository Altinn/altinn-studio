import { useTaskNavigationGroupQuery } from 'app-shared/hooks/queries/useTaskNavigationGroupQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { TaskNavigationGroup } from 'app-shared/types/api/dto/TaskNavigationGroup';
import { StudioAlert, StudioSpinner } from '@studio/components-legacy';
import { StudioParagraph, StudioHeading } from '@studio/components';
import React, { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { isTaskReceipt, getTaskIcon, taskNavigationType } from '../SettingsUtils';
import { PadlockLockedFillIcon } from '@studio/icons';
import classes from './SettingsNavigation.module.css';
import { TasksTable } from '../../TasksTable/TasksTable';
import { useLayoutSetsExtendedQuery } from 'app-shared/hooks/queries/useLayoutSetsExtendedQuery';

export const SettingsNavigation = (): ReactElement => {
  const { t } = useTranslation();

  const { org, app } = useStudioEnvironmentParams();
  const { data: taskNavigationGroups, isPending: tasksIsPending } = useTaskNavigationGroupQuery(
    org,
    app,
  );
  const { data: layoutSetsModel, isPending: layoutSetsPending } = useLayoutSetsExtendedQuery(
    org,
    app,
  );

  if (tasksIsPending || layoutSetsPending)
    return <StudioSpinner spinnerTitle={t('ux_editor.settings.navigation_tab_loading')} />;

  if (!taskNavigationGroups?.length)
    return (
      <StudioAlert className={classes.warningMessage} severity='warning'>
        {t('ux_editor.settings.navigation_warning')}
      </StudioAlert>
    );

  return (
    <div className={classes.navigationTabContent}>
      <div>
        <StudioHeading level={3} data-size='2xs'>
          {t('ux_editor.settings.navigation_tab_header')}
        </StudioHeading>
        <StudioParagraph className={classes.navigationDescription} data-size='sm'>
          {t('ux_editor.settings.navigation_tab_description')}
        </StudioParagraph>
      </div>
      {/*TODO: OnSelectTask and OnSelectAllTasks - Hide tasks #15239 and #15250 */}
      <TasksTable
        onSelectTask={() => {}}
        onSelectAllTasks={() => {}}
        tasks={taskNavigationGroups}
      />
      <div className={classes.navigationTaskList}>
        {taskNavigationGroups.map((task: TaskNavigationGroup, key: number) => (
          <TaskNavigation key={`${task.taskType}-${key}`} taskType={task.taskType} />
        ))}
      </div>
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
