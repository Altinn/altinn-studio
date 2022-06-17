import { IUiConfig } from 'src/types';

export const getUiConfigStateMock = (customStates?: Partial<IUiConfig>): IUiConfig=>{
  return {
    autoSave: true,
    focus: null,
    hiddenFields: [],
    repeatingGroups: {
      group: {
        index: 1,
        dataModelBinding: 'someGroup',
      }
    },
    fileUploadersWithTag: null,
    currentView: 'FormLayout',
    navigationConfig: {},
    layoutOrder: ['FormLayout'],
    ...customStates
  }
}
