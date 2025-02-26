import type { LayoutSetsModel } from 'app-shared/types/api/dto/LayoutSetsModel';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';

export const dataModelNameMock = 'test-data-model';
export const layoutSet1NameMock = 'test-layout-set';
export const layoutSet2NameMock = 'test-layout-set-2';
export const layoutSet3SubformNameMock = 'test-layout-set-3';

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
      id: layoutSet3SubformNameMock,
      dataType: 'data-model-3',
      type: 'subform',
    },
  ],
};

export const layoutSetsExtendedMock: LayoutSetsModel = {
  sets: [
    {
      id: layoutSet1NameMock,
      dataType: 'data-model',
      type: null,
      task: { id: 'Task_1', type: 'data' },
    },
    {
      id: layoutSet2NameMock,
      dataType: 'data-model-2',
      type: null,
      task: { id: 'Task_2', type: 'data' },
    },
    {
      id: layoutSet3SubformNameMock,
      dataType: 'data-model-3',
      type: 'subform',
      task: null,
    },
  ],
};
