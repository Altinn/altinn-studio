import type { UiFolderLayoutSetModel } from 'app-shared/types/api/dto/UiFolderLayoutSetModel';
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

export const layoutSetsExtendedMock: UiFolderLayoutSetModel[] = [
  {
    id: layoutSet1NameMock,
    dataType: 'data-model',
    type: null,
    taskType: 'data',
    pageCount: 3,
  },
  {
    id: layoutSet2NameMock,
    dataType: 'data-model-2',
    type: null,
    taskType: 'data',
    pageCount: 4,
  },
  {
    id: layoutSet3SubformNameMock,
    dataType: 'data-model-3',
    type: 'subform',
    taskType: null,
  },
];
