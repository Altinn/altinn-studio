import type { LayoutSet, LayoutSetsConfig } from 'src/features/layoutSets/types';

export const defaultDataTypeMock = 'test-data-model';
export const statelessDataTypeMock = 'stateless';
export function getLayoutSetsConfigMock(): LayoutSetsConfig {
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
    uiSettings: {
      hideCloseButton: false,
      showLanguageSelector: false,
      showExpandWidthButton: true,
      expandedWidth: false,
      showProgress: false,
      autoSaveBehavior: 'onChangeFormData',
      taskNavigation: [],
    },
  };
}

export function getSubFormLayoutSetMock(): LayoutSet {
  return {
    id: 'subform-layout',
    dataType: 'subform-data',
  };
}
