import {
  TasklistIcon,
  SealCheckmarkIcon,
  PencilLineIcon,
  CardIcon,
  ReceiptIcon,
  FolderIcon,
} from '@studio/icons';
import { PROTECTED_TASK_NAME_CUSTOM_RECEIPT } from 'app-shared/constants';

export const taskNavigationType = (taskType: string) => {
  if (taskType === 'receipt' || taskType === PROTECTED_TASK_NAME_CUSTOM_RECEIPT) {
    return 'process_editor.configuration_panel_custom_receipt_accordion_header';
  } else {
    return `process_editor.task_type.${taskType}`;
  }
};

export enum TaskType {
  Data = 'data',
  Confirmation = 'confirmation',
  Signing = 'signing',
  Payment = 'payment',
  Receipt = 'receipt',
  CustomReceipt = PROTECTED_TASK_NAME_CUSTOM_RECEIPT,
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
    case TaskType.CustomReceipt:
      return ReceiptIcon;
    default:
      return FolderIcon;
  }
};

export const isTaskReceipt = (taskType: string) => {
  return taskType === 'receipt' || taskType === PROTECTED_TASK_NAME_CUSTOM_RECEIPT;
};
