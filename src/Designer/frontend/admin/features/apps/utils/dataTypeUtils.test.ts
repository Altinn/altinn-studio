import { describe, expect, it } from 'vitest';
import { getTaskIdsForDataType } from './dataTypeUtils';

describe('getTaskIdsForDataType', () => {
  it('returns taskIds and ignores taskId when taskIds is set', () => {
    expect(getTaskIdsForDataType({ taskId: 'Task_3', taskIds: ['Task_1', 'Task_2'] })).toEqual([
      'Task_1',
      'Task_2',
    ]);
  });

  it('returns an empty list when taskIds is empty, even when taskId is set', () => {
    expect(getTaskIdsForDataType({ taskId: 'Task_1', taskIds: [] })).toEqual([]);
  });

  it('returns taskId as a list when taskIds is missing or null', () => {
    expect(getTaskIdsForDataType({ taskId: 'Task_1' })).toEqual(['Task_1']);
    expect(getTaskIdsForDataType({ taskId: 'Task_1', taskIds: null })).toEqual(['Task_1']);
  });

  it('returns an empty list when the data type is bound to no task', () => {
    expect(getTaskIdsForDataType({})).toEqual([]);
    expect(getTaskIdsForDataType({ taskId: '' })).toEqual([]);
  });
});
