import React, { ReactElement } from 'react';
import { StudioButton, StudioTable } from '@studio/components';
import classes from './TasksTable.module.css';
import cn from 'classnames';
import { TasksTableBody } from './TasksTableBody';

// const tasks = [
//   {
//     taskType: 'Task 1',
//     taskName: 'Type 1',
//     numberOfPages: 2,
//   },
//   {
//     taskType: 'Task 2',
//     taskName: 'Type 2',
//     numberOfPages: 24,
//   },
// ];

export type taskInfo = {
  taskType: string;
  taskName: string;
  numberOfPages: number;
};

type TasksTableProps = {
  tasks?: taskInfo[];
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
  return (
    <StudioTable
      border={true}
      className={cn(classes.tasksTable, {
        [classes.hiddenTasksTable]: !isNavigationMode,
      })}
    >
      <StudioTable.Head>
        <StudioTable.Row>
          <StudioTable.HeaderCell>Oppgave</StudioTable.HeaderCell>
          <StudioTable.HeaderCell>Navn</StudioTable.HeaderCell>
          <StudioTable.HeaderCell>Antall Sider</StudioTable.HeaderCell>
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
            <StudioButton variant='secondary' onClick={() => onSelectAllTasks()}>
              Velg alle oppgaver
            </StudioButton>
          </StudioTable.Cell>
        </StudioTable.Row>
      </StudioTable.Foot>
    </StudioTable>
  );
};
