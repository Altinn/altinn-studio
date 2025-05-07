import {
  TasklistIcon,
  SealCheckmarkIcon,
  PencilLineIcon,
  CardIcon,
  ReceiptIcon,
  FolderIcon,
} from '@studio/icons';
import { PROTECTED_TASK_NAME_CUSTOM_RECEIPT } from 'app-shared/constants';
import type { LayoutSetsModel } from 'app-shared/types/api/dto/LayoutSetsModel';
import type { TaskNavigationGroup } from 'app-shared/types/api/dto/TaskNavigationGroup';

export const taskNavigationType = (taskType?: string) => {
  if (!taskType) return 'ux_editor.task_table_type.unknown';
  return `ux_editor.task_table_type.${taskType}`;
};

export enum TaskType {
  Data = 'data',
  Confirmation = 'confirmation',
  Signing = 'signing',
  Payment = 'payment',
  Receipt = 'receipt',
}

export const getTaskIcon = (taskType: string) => {
  switch (taskType) {
    case TaskType.Data:
      return TasklistIcon;
    case TaskType.Confirmation:
      return SealCheckmarkIcon;
    case TaskType.Signing:
      return PencilLineIcon;
    case TaskType.Payment:
      return CardIcon;
    case TaskType.Receipt:
      return ReceiptIcon;
    default:
      return FolderIcon;
  }
};

export const isTaskReceipt = (taskType: string) => {
  return taskType === TaskType.Receipt || taskType === PROTECTED_TASK_NAME_CUSTOM_RECEIPT;
};

export const getTaskName = (task: TaskNavigationGroup, layoutSetsModel: LayoutSetsModel) => {
  if (task?.name) {
    return task.name;
  }

  if (task.taskType === TaskType.Receipt) {
    return 'ux_editor.task_table_type.receipt';
  }
  console.log(layoutSetsModel.sets);
  const matchingTask = layoutSetsModel?.sets.find(
    (layoutSet) => layoutSet.task?.id === task.taskId,
  );
  return matchingTask?.id ?? '-';
};

type GetHiddenTasksProps = {
  taskNavigationGroups: TaskNavigationGroup[];
  layoutSetsModel: LayoutSetsModel;
};

export const getHiddenTasks = ({ taskNavigationGroups, layoutSetsModel }: GetHiddenTasksProps) => {
  const layoutSets = layoutSetsModel.sets;

  const hiddenTasks = layoutSets.filter((layoutSet) => {
    return !taskNavigationGroups.some((task) => task.taskId === layoutSet.task?.id);
  });

  const filteredHiddenTasks = hiddenTasks.filter((task) => {
    return task?.type !== 'subform';
  });

  return filteredHiddenTasks.map((task) => ({
    taskType: task.task?.type,
    name: task.id,
    pageCount: undefined,
    taskId: task.id,
  }));
};
