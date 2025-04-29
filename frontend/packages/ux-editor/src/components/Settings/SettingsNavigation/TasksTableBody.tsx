import React, { ReactElement } from 'react';
import type { taskInfo } from './TasksTable';
import { StudioButton, StudioHeading, StudioParagraph, StudioTable } from '@studio/components';
import { StudioAlert } from '@studio/components-legacy';
import { MenuElipsisVerticalIcon } from '@studio/icons';
import classes from './TasksTableBody.module.css';
import cn from 'classnames';

type TasksTableBodyProps = {
  tasks: taskInfo[];
  isNavigationMode: boolean;
  onSelectTask: (index: number) => void;
};

export const TasksTableBody = ({
  tasks,
  isNavigationMode,
  onSelectTask,
}: TasksTableBodyProps): ReactElement | ReactElement[] => {
  const displayInfoMessage = isNavigationMode && tasks.length === 0;

  if (displayInfoMessage) {
    return (
      <StudioTable.Cell colSpan={4}>
        <StudioAlert className={classes.alertMessage}>
          <StudioHeading level={4} data-size='2xs' className={classes.alertTitle}>
            Du viser ingen oppgaver i navigasjonen
          </StudioHeading>
          <StudioParagraph>
            For å se oppgavene her, må du velge dem fra tabellen under.
          </StudioParagraph>
        </StudioAlert>
      </StudioTable.Cell>
    );
  }

  return tasks.map((task, index) => {
    return (
      <StudioTable.Row
        key={index}
        className={cn(classes.taskRow, { [classes.hiddenTaskRow]: !isNavigationMode })}
      >
        <StudioTable.Cell>{task.taskType}</StudioTable.Cell>
        <StudioTable.Cell>{task.taskName}</StudioTable.Cell>
        <StudioTable.Cell>{task.numberOfPages}</StudioTable.Cell>
        <StudioTable.Cell onClick={() => onSelectTask(index)}>
          <ActionCellContent isNavigationMode={isNavigationMode} />
        </StudioTable.Cell>
      </StudioTable.Row>
    );
  });
};

const ActionCellContent = ({ isNavigationMode }: Partial<TasksTableBodyProps>): ReactElement => {
  return isNavigationMode ? <MenuElipsisVerticalIcon /> : <StudioButton variant='secondary' />;
};
