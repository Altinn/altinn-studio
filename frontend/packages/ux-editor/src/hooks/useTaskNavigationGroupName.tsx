import { useLayoutSetsExtendedQuery } from 'app-shared/hooks/queries/useLayoutSetsExtendedQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { TaskNavigationGroup } from 'app-shared/types/api/dto/TaskNavigationGroup';
import { useTextResourceValue } from '../components/TextResource/hooks/useTextResourceValue';
import { useTranslation } from 'react-i18next';
import { getLayoutSetIdForTask, TaskType } from '../components/Settings/SettingsUtils';

type ReturnTaskNamesProps = {
  taskNavigationName: string;
  taskIdName?: string;
};

export const useTaskNavigationGroupName = (task: TaskNavigationGroup): ReturnTaskNamesProps => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: layoutSets } = useLayoutSetsExtendedQuery(org, app);
  const textResourceName = useTextResourceValue(task?.name);
  const isReceiptWithoutName = task.taskType === TaskType.Receipt && !task?.name;

  if (isReceiptWithoutName) {
    return {
      taskNavigationName: t('ux_editor.task_table_type.receipt'),
      taskIdName: undefined,
    };
  }

  const taskNavigationName = task?.name
    ? (textResourceName ?? task.name)
    : t(`ux_editor.task_table_type.${task.taskType}`);

  return {
    taskNavigationName,
    taskIdName: getLayoutSetIdForTask(task, layoutSets),
  };
};
