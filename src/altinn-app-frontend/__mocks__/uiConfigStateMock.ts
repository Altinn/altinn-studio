import type { IUiConfig } from 'src/types';

export const getUiConfigStateMock = (
  customStates?: Partial<IUiConfig>,
): IUiConfig => {
  return {
    autoSave: true,
    focus: null,
    hiddenFields: [],
    repeatingGroups: {
      group: {
        index: 1,
        dataModelBinding: 'someGroup',
      },
      referencedGroup: {
        index: 1,
        dataModelBinding: 'referencedGroup',
      },
    },
    fileUploadersWithTag: null,
    currentView: 'FormLayout',
    navigationConfig: {},
    layoutOrder: ['FormLayout'],
    ...customStates,
  };
};
