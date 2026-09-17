import { ComponentType } from 'app-shared/types/ComponentType';
import type { FormLayoutsResponse } from 'app-shared/types/api/FormLayoutsResponse';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import { getSubformComponentIds, getSubformLayoutSetIdsForDataType } from './subformComponentUtils';

const layoutSets: LayoutSets = [
  { id: 'Task_1', dataType: 'subform-data', taskId: 'Task_1' },
  { id: 'my-subform', dataType: 'subform-data', type: 'subform' },
  { id: 'also-my-subform', dataType: 'subform-data', type: 'subform' },
  { id: 'another-subform', dataType: 'other-data', type: 'subform' },
];

describe('getSubformLayoutSetIdsForDataType', () => {
  it('returns the subform layout sets that store the data type, and no other layout set', () => {
    expect(getSubformLayoutSetIdsForDataType(layoutSets, 'subform-data')).toEqual([
      'my-subform',
      'also-my-subform',
    ]);
  });

  it('returns nothing when the task has no data type yet', () => {
    expect(getSubformLayoutSetIdsForDataType(layoutSets, '')).toEqual([]);
  });

  it('returns nothing when no subform stores the data type', () => {
    expect(getSubformLayoutSetIdsForDataType(layoutSets, 'unused-data')).toEqual([]);
  });
});

describe('getSubformComponentIds', () => {
  it('returns the subform components that open one of the given layout sets', () => {
    const layouts = createLayouts([
      { id: 'AnInput', type: ComponentType.Input },
      { id: 'TheSubformTable', type: ComponentType.Subform, layoutSet: 'my-subform' },
      { id: 'AnotherSubformTable', type: ComponentType.Subform, layoutSet: 'another-subform' },
    ]);

    expect(getSubformComponentIds(layouts, ['my-subform'])).toEqual(['TheSubformTable']);
  });

  it('returns nothing when the layouts have not been loaded', () => {
    expect(getSubformComponentIds(undefined, ['my-subform'])).toEqual([]);
  });
});

const createLayouts = (layout: object[]): FormLayoutsResponse =>
  ({
    Side1: { data: { layout } },
    Side2: { data: {} },
  }) as unknown as FormLayoutsResponse;
