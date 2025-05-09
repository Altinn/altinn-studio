import React, { type ReactElement } from 'react';
import type { TaskNavigationGroup } from 'app-shared/types/api/dto/TaskNavigationGroup';
import { StudioButton, StudioHeading, StudioParagraph, StudioTable } from '@studio/components';
import { StudioAlert } from '@studio/components-legacy';
import { MenuElipsisVerticalIcon, EyeClosedIcon } from '@studio/icons';
import classes from './TasksTableBody.module.css';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import { getTaskIcon, getTaskName, taskNavigationType } from '../Settings/SettingsUtils';
import { useLayoutSetsExtendedQuery } from 'app-shared/hooks/queries/useLayoutSetsExtendedQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useTextResourceValue } from '../TextResource/hooks/useTextResourceValue';

export type TasksTableBodyProps = {
  tasks: TaskNavigationGroup[];
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
    const uniqueKey = `${task.taskType}-${index}-${isNavigationMode ? 'navigation' : 'hidden'}`;
    return (
      <TaskRow
        key={uniqueKey}
        task={task}
        index={index}
        isNavigationMode={isNavigationMode}
        onSelectTask={onSelectTask}
      />
    );
  });
};

type TaskRowProps = {
  task: TaskNavigationGroup;
  index: number;
  isNavigationMode: boolean;
  onSelectTask: (index: number) => void;
};

const TaskRow = ({ task, index, isNavigationMode, onSelectTask }: TaskRowProps): ReactElement => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: layoutSetsModel } = useLayoutSetsExtendedQuery(org, app);
  const TaskIcon = getTaskIcon(task.taskType);
  const taskType = taskNavigationType(task.taskType);
  const taskName = useTextResourceValue(task?.name) ?? getTaskName(task, layoutSetsModel);

  return (
    <StudioTable.Row
      className={cn(classes.taskRow, { [classes.hiddenTaskRow]: !isNavigationMode })}
    >
      <StudioTable.Cell>
        <div className={classes.taskTypeCellContent}>
          <TaskIcon />
          {t(taskType)}
        </div>
      </StudioTable.Cell>
      <StudioTable.Cell>{t(taskName)}</StudioTable.Cell>
      <StudioTable.Cell>{task?.pageCount}</StudioTable.Cell>
      <StudioTable.Cell>
        <StudioButton
          variant='tertiary'
          icon={isNavigationMode ? <MenuElipsisVerticalIcon /> : <EyeClosedIcon />}
          title={isNavigationMode ? undefined : t('ux_editor.task_table_display')}
          onClick={() => onSelectTask(index)}
        />
      </StudioTable.Cell>
    </StudioTable.Row>
  );
};
