import {
  isTaskReceipt,
  getTaskIcon,
  taskNavigationType,
  TaskType,
  getTaskName,
} from './SettingsUtils';
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
    expect(taskNavigationType('receipt')).toBe('ux_editor.task_table_type.receipt');
    expect(taskNavigationType('data')).toBe('ux_editor.task_table_type.data');
    expect(taskNavigationType('feedback')).toBe('ux_editor.task_table_type.feedback');
    expect(taskNavigationType('payment')).toBe('ux_editor.task_table_type.payment');
    expect(taskNavigationType('signing')).toBe('ux_editor.task_table_type.signing');
    expect(taskNavigationType('confirmation')).toBe('ux_editor.task_table_type.confirmation');
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

describe('getTaskName', () => {
  const layoutSetsModel = {
    sets: [
      { id: 'laaang', dataType: '', type: null, task: { id: 'task1', type: '' } },
      { id: 'tang', dataType: '', type: null, task: { id: 'task2', type: '' } },
    ],
  };

  it('should return the task name if it exists', () => {
    const task = { name: 'Task Name', taskType: 'data', taskId: 'task1' };
    expect(getTaskName(task, layoutSetsModel)).toBe('Task Name');
  });

  it('should return the layout set id if name does not exist', () => {
    const task = { taskType: 'data', taskId: 'task1' };
    expect(getTaskName(task, layoutSetsModel)).toBe('laaang');
  });

  it('should return receipt text key if taskType is receipt', () => {
    const task = { taskType: 'receipt', taskId: 'task1' };
    expect(getTaskName(task, layoutSetsModel)).toBe('ux_editor.task_table_type.receipt');
  });

  it('should return the default value if no matching task is found', () => {
    const task = { name: '', taskType: 'unknown', taskId: 'unknown' };
    expect(getTaskName(task, layoutSetsModel)).toBe('-');
  });
});
