import {
  TasklistIcon,
  SealCheckmarkIcon,
  PencilLineIcon,
  CardIcon,
  ReceiptIcon,
  FolderIcon,
} from '@studio/icons';
import { PROTECTED_TASK_NAME_CUSTOM_RECEIPT } from 'app-shared/constants';
import type { LayoutSetModel } from 'app-shared/types/api/dto/LayoutSetModel';
import type { TaskNavigationGroup } from 'app-shared/types/api/dto/TaskNavigationGroup';
import { generateRandomId } from 'app-shared/utils/generateRandomId';
import { generateId } from '../TextResource/TextResource';

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
  layoutSets: LayoutSetModel[];
};

export const getHiddenTasks = ({
  taskNavigationGroups,
  layoutSets,
}: GetHiddenTasksProps): TaskNavigationGroup[] => {
  const filteredLayoutSets = layoutSets.filter((layoutSet) => {
    return (
      layoutSet?.type !== 'subform' &&
      layoutSet.task?.id !== PROTECTED_TASK_NAME_CUSTOM_RECEIPT &&
      layoutSet?.task
    );
  });

  const internalTasksFormat: TaskNavigationGroup[] = filteredLayoutSets.map((layoutSet) => ({
    taskId: layoutSet.task.id,
    taskType: layoutSet.task.type,
    pageCount: undefined, // This will be added later: https://digdir.slack.com/archives/C07PN8DMJ2E/p1746537888455189
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
  layoutSets: LayoutSetModel[],
): LayoutSetModel => {
  const isReceipt = task.taskType === TaskType.Receipt;
  const taskId = isReceipt ? PROTECTED_TASK_NAME_CUSTOM_RECEIPT : task.taskId;

  return layoutSets?.find((layoutSet) => layoutSet.task?.id === taskId);
};

export const getLayoutSetIdForTask = (
  task: TaskNavigationGroup,
  layoutSets: LayoutSetModel[],
): string => {
  const matchingLayoutSet = getLayoutSetForTask(task, layoutSets);
  return matchingLayoutSet?.id;
};

export const isDefaultReceiptTask = (
  task: TaskNavigationGroup,
  layoutSets: LayoutSetModel[],
): boolean => {
  const isReceipt = task.taskType === TaskType.Receipt;
  const isCustomReceipt = layoutSets?.some(
    (layoutSet) => layoutSet.task?.id === PROTECTED_TASK_NAME_CUSTOM_RECEIPT,
  );

  return isReceipt && !isCustomReceipt;
};

export const createNewTextResourceId = (task: TaskNavigationGroup): string => {
  const generateIdOptions = {
    layoutId: task.taskType,
    componentId: task?.taskId ?? task.taskType,
    textResourceKey: generateRandomId(6),
  };

  return generateId(generateIdOptions);
};
