import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';

export const dataModelNameMock = 'test-data-model';
export const layoutSet1NameMock = 'test-layout-set';
export const layoutSet2NameMock = 'test-layout-set-2';

export const layoutSetsMock: LayoutSets = {
  sets: [
    {
      id: layoutSet1NameMock,
      dataType: 'data-model',
      taskId: 'Task_1',
    },
    {
      id: layoutSet2NameMock,
      dataType: 'data-model-2',
      taskId: 'Task_2',
    },
  ],
};
