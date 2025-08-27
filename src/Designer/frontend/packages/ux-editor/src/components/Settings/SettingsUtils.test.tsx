import {
  getHiddenTasks,
  getLayoutSetForTask,
  getLayoutSetIdForTask,
  getTaskIcon,
  isDefaultReceiptTask,
  taskNavigationType,
  TaskType,
} from './SettingsUtils';
import {
  CardIcon,
  FolderIcon,
  PencilLineIcon,
  ReceiptIcon,
  SealCheckmarkIcon,
  TasklistIcon,
} from '@studio/icons';

const layoutSetsMock = [
  { id: 'layout1', dataType: null, type: '', task: { id: 'task1', type: 'data' } },
  { id: 'layout3', dataType: null, type: '', task: { id: 'task3', type: 'subform' } },
  { id: 'layout4', dataType: null, type: '', task: { id: 'task4', type: 'signing' } },
  { id: 'layout5', dataType: null, type: '', task: { id: 'CustomReceipt', type: '' } },
];

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
  const taskNavigationGroups = [
    { taskId: 'task1', name: 'Task 1', taskType: TaskType.Data },
    { taskId: 'task3', name: 'Task 3', taskType: TaskType.Signing },
  ];

  it('should return the correct hidden tasks', () => {
    const result = getHiddenTasks({ taskNavigationGroups, layoutSets: layoutSetsMock });
    expect(result).toEqual([
      { taskId: 'task4', taskType: TaskType.Signing, pageCount: undefined },
      { taskType: TaskType.Receipt },
    ]);
  });

  it('should not include layout sets without a task', () => {
    const result = getHiddenTasks({
      taskNavigationGroups: [],
      layoutSets: [
        { id: 'layout1', dataType: null, type: '', task: null },
        { id: 'layout2', dataType: null, type: '', task: { id: 'task2', type: 'data' } },
      ],
    });
    expect(result).toEqual([
      { taskId: 'task2', taskType: TaskType.Data, pageCount: undefined },
      { taskType: TaskType.Receipt },
    ]);
  });
});

describe('getLayoutSetForTask', () => {
  it('should return the correct layout set for a given task', () => {
    const task = { taskId: 'task1', name: 'Task 1', taskType: TaskType.Data };
    expect(getLayoutSetForTask(task, layoutSetsMock)).toBe(layoutSetsMock[0]);
  });

  it('should return the correct layout set for a custom receipt', () => {
    const task = { taskType: TaskType.Receipt };
    expect(getLayoutSetForTask(task, layoutSetsMock)).toBe(layoutSetsMock[3]);
  });
});

describe('getLayoutSetIdForTask', () => {
  it('should return the correct layout set ID for a given task', () => {
    const task = { taskId: 'task1', name: 'Task 1', taskType: TaskType.Data };
    expect(getLayoutSetIdForTask(task, layoutSetsMock)).toBe('layout1');
  });

  it('should return layout set ID for a custom receipt', () => {
    const task = { taskType: TaskType.Receipt };
    expect(getLayoutSetIdForTask(task, layoutSetsMock)).toBe('layout5');
  });
});

describe('isDefaultReceiptTask', () => {
  it('should return true for default receipt task', () => {
    const layoutSetsWithoutCustomReceipt = layoutSetsMock.filter(
      (layoutSet) => layoutSet.task.id !== 'CustomReceipt',
    );
    const task = { taskType: TaskType.Receipt };
    expect(isDefaultReceiptTask(task, layoutSetsWithoutCustomReceipt)).toBe(true);
  });

  it('should return false for non-receipt task', () => {
    const task = { taskType: TaskType.Data };
    expect(isDefaultReceiptTask(task, layoutSetsMock)).toBe(false);
  });

  it('should return false for custom receipt task', () => {
    const task = { taskType: TaskType.Receipt };
    expect(isDefaultReceiptTask(task, layoutSetsMock)).toBe(false);
  });
});
