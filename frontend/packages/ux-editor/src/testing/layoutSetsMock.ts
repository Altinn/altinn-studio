import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';

export const dataModelNameMock = 'test-data-model';
export const layoutSet1NameMock = 'test-layout-set';
export const layoutSet2NameMock = 'test-layout-set-2';
export const layoutSet3SubFormNameMock = 'test-layout-set-3';

export const layoutSetsMock: LayoutSets = {
  sets: [
    {
      id: layoutSet1NameMock,
      dataType: 'data-model',
      tasks: ['Task_1'],
    },
    {
      id: layoutSet2NameMock,
      dataType: 'data-model-2',
      tasks: ['Task_2'],
    },
    {
      id: layoutSet3SubFormNameMock,
      dataType: 'data-model-3',
      type: 'subform',
    },
  ],
};
