import React from 'react';
import { StudioButton, StudioHeading, StudioParagraph, StudioTable } from '@studio/components';
import { StudioAlert } from '@studio/components-legacy';
import classes from './TasksTable.module.css';
import cn from 'classnames';

const navigationTasks = [
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
  isNavigationMode?: boolean;
  onSelectTask: (index: number) => void;
  onSelectAllTasks: () => void;
};

export const TasksTable = ({
  isNavigationMode = true,
  onSelectTask,
  onSelectAllTasks,
}: TasksTableProps) => {
  const displayInfoMessage = isNavigationMode && navigationTasks.length > 0;

  return (
    <StudioTable
      border={true}
      className={cn(classes.tasksTable, {
        [classes.tasksHiddenTable]: !isNavigationMode,
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
        {displayInfoMessage ? (
          <StudioTable.Row className={classes.taskRow}>
            <StudioTable.Cell colSpan={4} className={classes.taskTypeCell}>
              <StudioAlert className={classes.alertMessage}>
                <StudioHeading level={4} data-size='2xs' className={classes.alertTitle}>
                  Du viser ingen oppgaver i navigasjonen
                </StudioHeading>
                <StudioParagraph>
                  For å se oppgavene her, må du velge dem fra tabellen under.
                </StudioParagraph>
              </StudioAlert>
            </StudioTable.Cell>
          </StudioTable.Row>
        ) : (
          navigationTasks.map((task, index) => (
            <StudioTable.Row key={index} className={classes.taskRow}>
              <StudioTable.Cell className={classes.taskTypeCell}>{task.taskType}</StudioTable.Cell>
              <StudioTable.Cell className={classes.nameCell}>{task.taskName}</StudioTable.Cell>
              <StudioTable.Cell className={classes.pagesCell}>
                {task.numberOfPages}
              </StudioTable.Cell>
              <StudioTable.Cell className={classes.actionCell} onClick={() => onSelectTask(index)}>
                Actions
              </StudioTable.Cell>
            </StudioTable.Row>
          ))
        )}
      </StudioTable.Body>
      <StudioTable.Foot>
        <StudioTable.Row>
          <StudioTable.Cell colSpan={4} className={classes.taskFooterContent}>
            <StudioButton variant='secondary' onClick={() => onSelectAllTasks()}>
              Skjul alle oppgavene
            </StudioButton>
          </StudioTable.Cell>
        </StudioTable.Row>
      </StudioTable.Foot>
    </StudioTable>
  );
};
