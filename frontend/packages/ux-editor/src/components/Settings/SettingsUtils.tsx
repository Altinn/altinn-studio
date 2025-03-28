import React, { type ReactElement } from 'react';
import {
  NavigationDataIcon,
  QuestionmarkIcon,
  ReceiptIcon,
  NavigationSignIcon,
  NavigationPayIcon,
} from '@studio/icons';

export const taskNavigationType = (taskType: string) => {
  if (taskType === 'receipt' || taskType === 'PROTECTED_TASK_NAME_CUSTOM_RECEIPT') {
    return 'process_editor.configuration_panel_custom_receipt_accordion_header';
  } else {
    return `process_editor.task_type.${taskType}`;
  }
};

export const taskNavigationIcon = (taskType: string, taskIcon?: string): ReactElement => {
  if (isReceipt(taskType)) return <ReceiptIcon className={taskIcon} />;
  if (taskType == 'data') return <NavigationDataIcon className={taskIcon} />;
  if (taskType == 'signing') return <NavigationSignIcon className={taskIcon} />;
  if (taskType == 'payment') return <NavigationPayIcon className={taskIcon} />;

  return <QuestionmarkIcon />;
};

export const isReceipt = (taskType: string) => {
  return taskType === 'receipt' || taskType === 'PROTECTED_TASK_NAME_CUSTOM_RECEIPT';
};
