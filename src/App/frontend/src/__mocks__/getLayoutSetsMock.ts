import type { AltinnUi, UiFolders } from 'src/features/form/layoutSets/types';

export const defaultDataTypeMock = 'test-data-model';
export const statelessDataTypeMock = 'stateless';

type MockUiFolder = {
  id: string;
  defaultDataType?: string;
};

export function getLayoutSetsMock(): { sets: MockUiFolder[]; uiSettings: AltinnUi['settings'] } {
  return {
    sets: [
      { id: 'stateless', defaultDataType: statelessDataTypeMock },
      { id: 'stateless-anon', defaultDataType: 'stateless-anon' },
      { id: 'Task_1', defaultDataType: defaultDataTypeMock },
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

export function getUiFoldersMock(): { folders: UiFolders; uiSettings: AltinnUi['settings'] } {
  const layoutSets = getLayoutSetsMock();
  return {
    folders: Object.fromEntries(layoutSets.sets.map((set) => [set.id, { defaultDataType: set.defaultDataType }])),
    uiSettings: layoutSets.uiSettings,
  };
}

export function getSubFormLayoutSetMock(): MockUiFolder {
  return { id: 'subform-layout', defaultDataType: 'subform-data' };
}

export function getUiMock(): AltinnUi {
  const ui = getUiFoldersMock();
  return {
    folders: ui.folders,
    settings: ui.uiSettings,
  };
}
