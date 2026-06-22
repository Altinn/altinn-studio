import {
  TasklistIcon,
  SealCheckmarkIcon,
  PencilLineIcon,
  CardIcon,
  ReceiptIcon,
  FolderIcon,
} from '@studio/icons';
import { PROTECTED_TASK_NAME_CUSTOM_RECEIPT } from 'app-shared/constants';
import type { UiFolderLayoutSetModel } from 'app-shared/types/api/dto/UiFolderLayoutSetModel';
import type { TaskNavigationGroup } from 'app-shared/types/api/dto/TaskNavigationGroup';
import { generateRandomId } from 'app-shared/utils/generateRandomId';
import { generateTextResourceId } from '../../utils/generateId';

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

type GetHiddenTasksProps = {
  taskNavigationGroups: TaskNavigationGroup[];
  layoutSets: UiFolderLayoutSetModel[];
};

export const getHiddenTasks = ({
  taskNavigationGroups,
  layoutSets,
}: GetHiddenTasksProps): TaskNavigationGroup[] => {
  const filteredLayoutSets = layoutSets.filter((layoutSet) => {
    return (
      layoutSet?.type !== 'subform' &&
      layoutSet?.id !== PROTECTED_TASK_NAME_CUSTOM_RECEIPT &&
      layoutSet?.taskType
    );
  });

  const internalTasksFormat: TaskNavigationGroup[] = filteredLayoutSets.map((layoutSet) => ({
    taskId: layoutSet.id,
    taskType: layoutSet.taskType,
    pageCount: layoutSet.pageCount,
  }));

  const isReceiptInNavigationGroups = taskNavigationGroups.some(
    (taskGroup) => taskGroup.taskType === TaskType.Receipt,
  );
  if (!isReceiptInNavigationGroups) {
    internalTasksFormat.push({
      taskType: TaskType.Receipt,
    });
  }

  const hiddenTasks = internalTasksFormat.filter((task) => {
    return !taskNavigationGroups.some((navigationTask) => navigationTask?.taskId === task?.taskId);
  });

  return hiddenTasks;
};

export const getLayoutSetForTask = (
  task: TaskNavigationGroup,
  layoutSets: UiFolderLayoutSetModel[],
): UiFolderLayoutSetModel => {
  const isReceipt = task.taskType === TaskType.Receipt;
  const taskId = isReceipt ? PROTECTED_TASK_NAME_CUSTOM_RECEIPT : task.taskId;

  return layoutSets?.find((layoutSet) => layoutSet?.id === taskId);
};

export const getLayoutSetIdForTask = (
  task: TaskNavigationGroup,
  layoutSets: UiFolderLayoutSetModel[],
): string => {
  const matchingLayoutSet = getLayoutSetForTask(task, layoutSets);
  return matchingLayoutSet?.id;
};

export const isDefaultReceiptTask = (
  task: TaskNavigationGroup,
  layoutSets: UiFolderLayoutSetModel[],
): boolean => {
  const isReceipt = task.taskType === TaskType.Receipt;
  const isCustomReceipt = layoutSets?.some(
    (layoutSet) => layoutSet.id === PROTECTED_TASK_NAME_CUSTOM_RECEIPT,
  );

  return isReceipt && !isCustomReceipt;
};

export const createNewTextResourceId = (task: TaskNavigationGroup): string => {
  return generateTextResourceId({
    layoutId: task.taskType,
    componentId: task?.taskId ?? task.taskType,
    textKey: generateRandomId(6),
  });
};
