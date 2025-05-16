import { useTaskNavigationGroupQuery } from 'app-shared/hooks/queries/useTaskNavigationGroupQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { StudioDivider, StudioSpinner } from '@studio/components-legacy';
import { StudioParagraph, StudioHeading } from '@studio/components';
import React, { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import classes from './SettingsNavigation.module.css';
import { TasksTable } from '../../TasksTable/TasksTable';
import { useLayoutSetsExtendedQuery } from 'app-shared/hooks/queries/useLayoutSetsExtendedQuery';
import { getHiddenTasks } from '../SettingsUtils';

export const SettingsNavigation = (): ReactElement => {
  const { t } = useTranslation();

  const { org, app } = useStudioEnvironmentParams();
  const { data: layoutSetsModel, isPending: layoutSetsPending } = useLayoutSetsExtendedQuery(
    org,
    app,
  );
  const { data: taskNavigationGroups, isPending: tasksIsPending } = useTaskNavigationGroupQuery(
    org,
    app,
  );

  if (tasksIsPending || layoutSetsPending)
    return <StudioSpinner spinnerTitle={t('ux_editor.settings.navigation_tab_loading')} />;

  const hiddenTasks = getHiddenTasks({ taskNavigationGroups, layoutSetsModel });

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
      <StudioDivider className={classes.divider} />
      <StudioHeading level={4} data-size='2xs'>
        {t('ux_editor.task_table_hidden_tasks')}
      </StudioHeading>
      {/*TODO: OnSelectTask and OnSelectAllTasks - Display tasks #15252 */}
      <TasksTable
        isNavigationMode={false}
        onSelectTask={() => {}}
        onSelectAllTasks={() => {}}
        tasks={hiddenTasks}
      />
    </div>
  );
};
