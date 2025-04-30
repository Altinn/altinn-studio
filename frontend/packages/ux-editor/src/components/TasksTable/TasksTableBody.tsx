import React, { type ReactElement } from 'react';
import type { TaskInfo } from './TasksTable';
import { StudioButton, StudioHeading, StudioParagraph, StudioTable } from '@studio/components';
import { StudioAlert } from '@studio/components-legacy';
import { MenuElipsisVerticalIcon, EyeClosedIcon } from '@studio/icons';
import classes from './TasksTableBody.module.css';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import { getTaskIcon } from '../Settings/SettingsUtils';

export type TasksTableBodyProps = {
  tasks: TaskInfo[];
  isNavigationMode: boolean;
  onSelectTask: (index: number) => void;
};

export const TasksTableBody = ({
  tasks,
  isNavigationMode,
  onSelectTask,
}: TasksTableBodyProps): ReactElement | ReactElement[] => {
  const { t } = useTranslation();
  const displayInfoMessage = isNavigationMode && tasks.length === 0;

  if (displayInfoMessage) {
    return (
      <StudioTable.Row>
        <StudioTable.Cell colSpan={4}>
          <StudioAlert className={classes.alertMessage}>
            <StudioHeading level={4} data-size='2xs' className={classes.alertTitle}>
              {t('ux_editor.task_table_alert_title')}
            </StudioHeading>
            <StudioParagraph>{t('ux_editor.task_table_alert_message')}</StudioParagraph>
          </StudioAlert>
        </StudioTable.Cell>
      </StudioTable.Row>
    );
  }

  return tasks.map((task, index) => {
    const TaskIcon = getTaskIcon(task.taskType);
    const uniqueKey = `${task.taskType}-${index}-${isNavigationMode ? 'navigation' : 'hidden'}`;
    return (
      <StudioTable.Row
        key={uniqueKey}
        className={cn(classes.taskRow, { [classes.hiddenTaskRow]: !isNavigationMode })}
      >
        <StudioTable.Cell>
          <div className={classes.taskTypeCellContent}>
            <TaskIcon />
            {task.taskType}
          </div>
        </StudioTable.Cell>
        <StudioTable.Cell>{task.taskName}</StudioTable.Cell>
        <StudioTable.Cell>{task.numberOfPages}</StudioTable.Cell>
        <StudioTable.Cell onClick={() => onSelectTask(index)}>
          <ActionCellContent
            isNavigationMode={isNavigationMode}
            onSelectTask={() => onSelectTask(index)}
            index={index}
          />
        </StudioTable.Cell>
      </StudioTable.Row>
    );
  });
};

type ActionCellContentProps = {
  index: number;
  isNavigationMode: boolean;
  onSelectTask: (index: number) => void;
};

const ActionCellContent = ({
  index,
  isNavigationMode,
  onSelectTask,
}: ActionCellContentProps): ReactElement => {
  const { t } = useTranslation();

  if (isNavigationMode) return <MenuElipsisVerticalIcon />;

  return (
    <StudioButton variant='tertiary' icon={<EyeClosedIcon />} onClick={() => onSelectTask(index)}>
      {t('ux_editor.task_table_display')}
    </StudioButton>
  );
};
