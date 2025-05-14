import React, { type ReactElement } from 'react';
import { StudioButton, StudioTable } from '@studio/components';
import classes from './TasksTable.module.css';
import cn from 'classnames';
import { TasksTableBody } from './TasksTableBody';
import { useTranslation } from 'react-i18next';
import { EyeClosedIcon, EyeIcon } from '@studio/icons';
import type { TaskNavigationGroup } from 'app-shared/types/api/dto/TaskNavigationGroup';

export type TasksTableProps = {
  tasks?: TaskNavigationGroup[];
  isNavigationMode?: boolean;
  onSelectTask: (index: number) => void;
  onSelectAllTasks: () => void;
};

export const TasksTable = ({
  tasks = [],
  isNavigationMode = true,
  onSelectTask,
  onSelectAllTasks,
}: TasksTableProps): ReactElement => {
  const { t } = useTranslation();

  return (
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
        <TasksTableBody
          tasks={tasks}
          isNavigationMode={isNavigationMode}
          onSelectTask={onSelectTask}
        />
      </StudioTable.Body>
      <StudioTable.Foot>
        <StudioTable.Row>
          <StudioTable.Cell colSpan={4} className={classes.taskFooterContent}>
            <StudioButton
              variant='secondary'
              onClick={() => onSelectAllTasks()}
              icon={isNavigationMode ? <EyeIcon /> : <EyeClosedIcon />}
            >
              {isNavigationMode
                ? t('ux_editor.task_table_hide_all')
                : t('ux_editor.task_table_show_all')}
            </StudioButton>
          </StudioTable.Cell>
        </StudioTable.Row>
      </StudioTable.Foot>
    </StudioTable>
  );
};
