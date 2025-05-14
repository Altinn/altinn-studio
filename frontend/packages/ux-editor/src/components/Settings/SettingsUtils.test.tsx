import { getHiddenTasks, getTaskIcon, taskNavigationType, TaskType } from './SettingsUtils';
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
    expect(taskNavigationType(undefined)).toBe('ux_editor.task_table_type.unknown');
  });
});

describe('getTaskIcon', () => {
  it('should return the correct icon', () => {
    expect(getTaskIcon(TaskType.Data)).toBe(TasklistIcon);
    expect(getTaskIcon(TaskType.Confirmation)).toBe(SealCheckmarkIcon);
    expect(getTaskIcon(TaskType.Signing)).toBe(PencilLineIcon);
    expect(getTaskIcon(TaskType.Payment)).toBe(CardIcon);
    expect(getTaskIcon(TaskType.Receipt)).toBe(ReceiptIcon);
    expect(getTaskIcon('unknown')).toBe(FolderIcon);
  });
});

describe('getHiddenTasks', () => {
  const layoutSetsModel = {
    sets: [
      { id: 'layout1', dataType: null, type: '', task: { id: 'task1', type: 'data' } },
      { id: 'layout3', dataType: null, type: '', task: { id: 'task3', type: 'subform' } },
      { id: 'layout4', dataType: null, type: '', task: { id: 'task4', type: 'signing' } },
    ],
  };

  const taskNavigationGroups = [
    { taskId: 'task1', name: 'Task 1', taskType: TaskType.Data },
    { taskId: 'task3', name: 'Task 3', taskType: TaskType.Signing },
  ];

  it('should return the correct hidden tasks', () => {
    const result = getHiddenTasks({ taskNavigationGroups, layoutSetsModel });
    expect(result).toEqual([
      { taskId: 'task4', taskType: TaskType.Signing, pageCount: undefined },
      { taskType: TaskType.Receipt },
    ]);
  });
});
