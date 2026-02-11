import { behavesLikeDataTask } from 'src/utils/formLayout';
import type { UiFolders } from 'src/features/form/layoutSets/types';

describe('behavesLikeDataTask', () => {
  const uiFolders: UiFolders = {
    Task_1: { defaultDataType: 'SomeType' },
    Task_2: { defaultDataType: 'SomeType' },
  };
  it('should return true if a given task has configured a layout set', () => {
    const task = 'Task_1';
    const result = behavesLikeDataTask(task, uiFolders);
    expect(result).toBe(true);
  });

  it('should return false if a given task is not configured as a layout set', () => {
    const task = 'Task_3';
    const result = behavesLikeDataTask(task, uiFolders);
    expect(result).toBe(false);
  });
});
