import React, { type ReactElement } from 'react';
import type { TaskNavigationGroup } from 'app-shared/types/api/dto/TaskNavigationGroup';
import { StudioHeading, StudioParagraph, StudioAlert, StudioTable } from '@studio/components';
import classes from './TasksTableBody.module.css';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import {
  getLayoutSetForTask,
  getTaskIcon,
  taskNavigationType,
  TaskType,
} from '../Settings/SettingsUtils';
import { useTaskNavigationGroupName } from '../../hooks/useTaskNavigationGroupName';
import { TaskAction } from './TaskAction';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useLayoutSetsExtendedQuery } from 'app-shared/hooks/queries/useLayoutSetsExtendedQuery';

export type TasksTableBodyProps = {
  tasks: TaskNavigationGroup[];
  isNavigationMode: boolean;
};

export const TasksTableBody = ({
  tasks,
  isNavigationMode,
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
        tasks={tasks}
        index={index}
        isNavigationMode={isNavigationMode}
      />
    );
  });
};

type TaskRowProps = {
  task: TaskNavigationGroup;
  tasks: TaskNavigationGroup[];
  index: number;
  isNavigationMode: boolean;
};

const TaskRow = ({ task, tasks, index, isNavigationMode }: TaskRowProps): ReactElement => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: layoutSets } = useLayoutSetsExtendedQuery(org, app);
  const TaskIcon = getTaskIcon(task.taskType);
  const taskTypeName = taskNavigationType(task.taskType);
  const { taskNavigationName, taskIdName } = useTaskNavigationGroupName(task);

  const isReceipt = task.taskType === TaskType.Receipt;
  const taskTypeCellContent = isReceipt ? t(taskTypeName) : `${t(taskTypeName)}: ${taskIdName}`;
  const pageCount = getLayoutSetForTask(task, layoutSets)?.pageCount ?? (isReceipt ? 1 : 0);

  return (
    <StudioTable.Row
      className={cn(classes.taskRow, { [classes.hiddenTaskRow]: !isNavigationMode })}
    >
      <StudioTable.Cell className={classes.taskTypeCell}>
        <div className={classes.taskTypeCellContent}>
          <TaskIcon className={classes.taskIcon} />
          <span className={classes.taskType} title={taskIdName}>
            {taskTypeCellContent}
          </span>
        </div>
      </StudioTable.Cell>
      {isNavigationMode && (
        <StudioTable.Cell title={t(taskNavigationName)} className={classes.taskNameCell}>
          {t(taskNavigationName)}
        </StudioTable.Cell>
      )}
      <StudioTable.Cell className={classes.taskPageCountCell}>{pageCount}</StudioTable.Cell>
      <StudioTable.Cell>
        <TaskAction isNavigationMode={isNavigationMode} task={task} tasks={tasks} index={index} />
      </StudioTable.Cell>
    </StudioTable.Row>
  );
};
