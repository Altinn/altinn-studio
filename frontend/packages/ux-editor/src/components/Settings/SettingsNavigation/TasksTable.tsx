import React from 'react';
import { StudioButton, StudioTable } from '@studio/components';
import classes from './TasksTable.module.css';
import cn from 'classnames';

const content = [
  {
    taskType: 'Task 1',
    taskName: 'Type 1',
    numberOfPages: 2,
  },
  {
    taskType: 'Task 2',
    taskName: 'Type 2',
    numberOfPages: 24,
  },
];

type TasksTableProps = {
  tasksInNavigation?: boolean;
};

export const TasksTable = ({ tasksInNavigation = false }: TasksTableProps) => {
  return (
    <StudioTable
      border={true}
      className={cn(classes.tasksTable, {
        [classes.tasksHiddenTable]: tasksInNavigation,
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
        {content.map((item, index) => (
          <StudioTable.Row key={index} className={classes.taskRow}>
            <StudioTable.Cell className={classes.taskTypeCell}>{item.taskType}</StudioTable.Cell>
            <StudioTable.Cell className={classes.nameCell}>{item.taskName}</StudioTable.Cell>
            <StudioTable.Cell className={classes.pagesCell}>{item.numberOfPages}</StudioTable.Cell>
            <StudioTable.Cell className={classes.actionCell}>Actions</StudioTable.Cell>
          </StudioTable.Row>
        ))}
      </StudioTable.Body>
      <StudioTable.Foot>
        <StudioTable.Row>
          <StudioTable.Cell colSpan={4} className={classes.taskFooterContent}>
            <StudioButton variant='secondary'>Skjul alle oppgavene</StudioButton>
          </StudioTable.Cell>
        </StudioTable.Row>
      </StudioTable.Foot>
    </StudioTable>
  );
};
