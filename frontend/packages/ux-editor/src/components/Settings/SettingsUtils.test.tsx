import { isTaskReceipt, getTaskIcon, taskNavigationType, TaskType } from './SettingsUtils';
import {
  CardIcon,
  FolderIcon,
  PencilLineIcon,
  ReceiptIcon,
  SealCheckmarkIcon,
  TasklistIcon,
} from '@studio/icons';

describe('taskNavigationType', () => {
  it('should return the correct text key', () => {
    expect(taskNavigationType('receipt')).toBe(
      'process_editor.configuration_panel_custom_receipt_accordion_header',
    );
    expect(taskNavigationType('data')).toBe('process_editor.task_type.data');
    expect(taskNavigationType('feedback')).toBe('process_editor.task_type.feedback');
    expect(taskNavigationType('payment')).toBe('process_editor.task_type.payment');
    expect(taskNavigationType('signing')).toBe('process_editor.task_type.signing');
    expect(taskNavigationType('confirmation')).toBe('process_editor.task_type.confirmation');
  });
});

describe('taskNavigationIcon', () => {
  it('should return the correct icon', () => {
    expect(getTaskIcon(TaskType.Data)).toBe(TasklistIcon);
    expect(getTaskIcon(TaskType.Confirmation)).toBe(SealCheckmarkIcon);
    expect(getTaskIcon(TaskType.Signing)).toBe(PencilLineIcon);
    expect(getTaskIcon(TaskType.Payment)).toBe(CardIcon);
    expect(getTaskIcon(TaskType.Receipt)).toBe(ReceiptIcon);
    expect(getTaskIcon('unknown')).toBe(FolderIcon);
  });
});

describe('isTaskReceipt', () => {
  it('should return true if taskType is receipt', () => {
    expect(isTaskReceipt('receipt')).toBe(true);
  });

  it('should return false if taskType is not receipt', () => {
    expect(isTaskReceipt('data')).toBe(false);
  });
});
