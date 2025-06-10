import React, { type ReactElement } from 'react';
import { StudioButton, StudioLink, StudioTable } from '@studio/components';
import classes from './TasksTable.module.css';
import cn from 'classnames';
import { TasksTableBody } from './TasksTableBody';
import { useTranslation } from 'react-i18next';
import { EyeClosedIcon, EyeIcon, PlayFillIcon } from '@studio/icons';
import type { TaskNavigationGroup } from 'app-shared/types/api/dto/TaskNavigationGroup';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useTaskNavigationGroupMutation } from '@altinn/ux-editor/hooks/mutations/useTaskNavigationGroupMutation';
import { useSearchParams } from 'react-router-dom';
import { PackagesRouter } from 'app-shared/navigation/PackagesRouter';

export type TasksTableProps = {
  tasks?: TaskNavigationGroup[];
  isNavigationMode?: boolean;
  allTasks?: TaskNavigationGroup[];
};

export const TasksTable = ({
  tasks = [],
  isNavigationMode = true,
  allTasks = [],
}: TasksTableProps): ReactElement => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { mutate: updateTaskNavigationGroup } = useTaskNavigationGroupMutation(org, app);

  const [searchParams] = useSearchParams();
  const layout = searchParams?.get('layout');
  const packagesRouter = new PackagesRouter({ org, app });
  const previewLinkQueryParams = layout ? `?layout=${layout}` : '';
  const previewLink: string = `${packagesRouter.getPackageNavigationUrl('preview')}${previewLinkQueryParams}`;

  const handleMoveAllTasks = () => {
    if (!isNavigationMode || confirm(t('ux_editor.task_table.remove_tasks'))) {
      const newNavigationTaskList = isNavigationMode ? [] : allTasks;
      updateTaskNavigationGroup(newNavigationTaskList);
    }
  };

  return (
    <div>
      <StudioTable
        border={true}
        className={cn(classes.tasksTable, {
          [classes.hiddenTasksTable]: !isNavigationMode,
        })}
      >
        <StudioTable.Head>
          <StudioTable.Row>
            <StudioTable.HeaderCell>{t('ux_editor.task_table_type')}</StudioTable.HeaderCell>
            {isNavigationMode && (
              <StudioTable.HeaderCell>{t('ux_editor.task_table_name')}</StudioTable.HeaderCell>
            )}
            <StudioTable.HeaderCell>{t('ux_editor.task_table_pages')}</StudioTable.HeaderCell>
            <StudioTable.HeaderCell />
          </StudioTable.Row>
        </StudioTable.Head>
        <StudioTable.Body>
          <TasksTableBody tasks={tasks} isNavigationMode={isNavigationMode} />
        </StudioTable.Body>
        <StudioTable.Foot>
          <StudioTable.Row>
            <StudioTable.Cell colSpan={4} className={classes.taskFooterContent}>
              <StudioButton
                variant='secondary'
                onClick={handleMoveAllTasks}
                icon={isNavigationMode ? <EyeIcon /> : <EyeClosedIcon />}
                disabled={tasks.length === 0}
              >
                {isNavigationMode
                  ? t('ux_editor.task_table_hide_all')
                  : t('ux_editor.task_table_show_all')}
              </StudioButton>
            </StudioTable.Cell>
          </StudioTable.Row>
        </StudioTable.Foot>
      </StudioTable>
      {isNavigationMode && (
        <StudioLink
          href={previewLink}
          className={cn(classes.previewLink, { [classes.disabledPreviewLink]: tasks.length === 0 })}
          data-color='neutral'
        >
          <PlayFillIcon />
          {t('ux_editor.task_table_preview')}
        </StudioLink>
      )}
    </div>
  );
};
