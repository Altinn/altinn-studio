import type { IUiConfig } from 'src/types';

export const getUiConfigStateMock = (customStates?: Partial<IUiConfig>): IUiConfig => ({
  focus: null,
  pageOrderConfig: {
    hidden: [],
    hiddenExpr: {},
    order: ['FormLayout'],
  },
  hiddenFields: [],
  // TODO: Recreate these mocks somewhere else
  // repeatingGroups: {
  //   group: {
  //     index: 1,
  //     dataModelBinding: 'someGroup',
  //   },
  //   referencedGroup: {
  //     index: 1,
  //     dataModelBinding: 'referencedGroup',
  //   },
  //   testGroupId: {
  //     index: 1,
  //     dataModelBinding: 'Group',
  //   },
  // },
  currentView: 'FormLayout',
  excludePageFromPdf: [],
  excludeComponentFromPdf: [],
  ...customStates,
});
