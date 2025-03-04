import type { ILayoutSet, ILayoutSets } from 'src/layout/common.generated';

export const defaultDataTypeMock = 'test-data-model';
export const statelessDataTypeMock = 'stateless';
export function getLayoutSetsMock(): ILayoutSets {
  return {
    sets: [
      {
        id: 'stateless',
        dataType: statelessDataTypeMock,
      },
      {
        id: 'stateless-anon',
        dataType: 'stateless-anon',
      },
      {
        id: 'some-data-task',
        dataType: defaultDataTypeMock,
        tasks: ['Task_1'],
      },
      getSubFormLayoutSetMock(),
    ],
  };
}

export function getSubFormLayoutSetMock(): ILayoutSet {
  return {
    id: 'subform-layout',
    dataType: 'subform-data',
  };
}
