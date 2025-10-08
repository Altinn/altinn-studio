import { behavesLikeDataTask } from 'src/utils/formLayout';
import type { ILayoutSet } from 'src/layout/common.generated';

describe('behavesLikeDataTask', () => {
  const layoutSets: ILayoutSet[] = [
    { id: 'set_1', dataType: 'SomeType', tasks: ['Task_1'] },
    { id: 'set_2', dataType: 'SomeType', tasks: ['Task_2'] },
  ];
  it('should return true if a given task has configured a layout set', () => {
    const task = 'Task_1';
    const result = behavesLikeDataTask(task, layoutSets);
    expect(result).toBe(true);
  });

  it('should return false if a given task is not configured as a layout set', () => {
    const task = 'Task_3';
    const result = behavesLikeDataTask(task, layoutSets);
    expect(result).toBe(false);
  });
});
