import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';

export const dataModelNameMock = 'test-data-model';
export const layoutSet1NameMock = 'test-layout-set';
export const layoutSet2NameMock = 'test-layout-set-2';

export const layoutSetsMock: LayoutSets = {
  sets: [
    {
      id: layoutSet1NameMock,
      dataType: 'datamodel',
      tasks: ['Task_1'],
    },
    {
      id: layoutSet2NameMock,
      dataType: 'datamodel-2',
      tasks: ['Task_2'],
    },
  ],
};
