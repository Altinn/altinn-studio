import React, { type ReactElement } from 'react';
import {
  NavigationDataIcon,
  QuestionmarkIcon,
  ReceiptIcon,
  NavigationSignIcon,
  NavigationPayIcon,
} from '@studio/icons';
import { PROTECTED_TASK_NAME_CUSTOM_RECEIPT } from 'app-shared/constants';

export const taskNavigationType = (taskType: string) => {
  if (taskType === 'receipt' || taskType === PROTECTED_TASK_NAME_CUSTOM_RECEIPT) {
    return 'process_editor.configuration_panel_custom_receipt_accordion_header';
  } else {
    return `process_editor.task_type.${taskType}`;
  }
};

export const taskNavigationIcon = (taskType: string, taskIcon?: string): ReactElement => {
  switch (taskType) {
    case 'receipt':
    case PROTECTED_TASK_NAME_CUSTOM_RECEIPT:
      return <ReceiptIcon data-testid='receipt' className={taskIcon} />;
    case 'data':
      return <NavigationDataIcon data-testid='data' className={taskIcon} />;
    case 'signing':
      return <NavigationSignIcon data-testid='signing' className={taskIcon} />;
    case 'payment':
      return <NavigationPayIcon data-testid='payment' className={taskIcon} />;
    default:
      return <QuestionmarkIcon data-testid='questionMark' className={taskIcon} />;
  }
};

export const isTaskReceipt = (taskType: string) => {
  return taskType === 'receipt' || taskType === PROTECTED_TASK_NAME_CUSTOM_RECEIPT;
};
