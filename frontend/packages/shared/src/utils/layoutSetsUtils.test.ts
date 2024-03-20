import { getLayoutSetNameForCustomReceipt } from 'app-shared/utils/layoutSetsUtils';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';

// Test data
const layoutSetName = 'layoutSet';
const taskIdCustomReceipt = 'CustomReceipt';

describe('getLayoutSetNameForCustomReceipt', () => {
  it('should return name of layoutSet if layoutSets includes a set with taskId "CustomReceipt"', () => {
    const layoutSetsWithCustomReceipt: LayoutSets = {
      sets: [{ id: layoutSetName, tasks: [taskIdCustomReceipt] }],
    };
    expect(getLayoutSetNameForCustomReceipt(layoutSetsWithCustomReceipt)).toBe(layoutSetName);
  });

  it('should return undefined if layoutSets does not include a set with taskId "CustomReceipt"', () => {
    const layoutSetsWithoutCustomReceipt: LayoutSets = {
      sets: [
        {
          id: layoutSetName,
          tasks: ['task_1'],
        },
      ],
    };
    expect(getLayoutSetNameForCustomReceipt(layoutSetsWithoutCustomReceipt)).toBeUndefined();
  });

  it('should return undefined if layoutSets is undefined', () => {
    const layoutSets = undefined;
    expect(getLayoutSetNameForCustomReceipt(layoutSets)).toBeUndefined();
  });

  it('should return undefined if sets of layoutSets is undefined', () => {
    const layoutSetsWithUndefinedSets: LayoutSets = {
      sets: undefined,
    };
    expect(getLayoutSetNameForCustomReceipt(layoutSetsWithUndefinedSets)).toBeUndefined();
  });

  it('should return undefined if layoutSets has an empty list of sets', () => {
    const layoutSetsWithEmptySets: LayoutSets = {
      sets: [],
    };
    expect(getLayoutSetNameForCustomReceipt(layoutSetsWithEmptySets)).toBeUndefined();
  });
});
