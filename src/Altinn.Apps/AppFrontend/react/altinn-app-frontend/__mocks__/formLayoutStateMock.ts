import { ILayoutState } from '../src/features/form/layout/formLayoutReducer';

export function getFormLayoutStateMock(customStates?: Partial<ILayoutState>): ILayoutState {
  const mockFormLayoutState: ILayoutState = {
    layouts: {
      FormLayout: [
        {
          id: 'field1',
          type: 'Input',
          dataModelBindings: {
            simple: 'Group.prop1',
          },
          textResourceBindings: {
            title: 'Title',
          },
          readOnly: false,
          required: false,
          disabled: false,
        },
        {
          id: 'field2',
          type: 'Input',
          dataModelBindings: {
            simple: 'Group.prop2',
          },
          textResourceBindings: {
            title: 'Title',
          },
          readOnly: false,
          required: false,
          disabled: false,
        },
        {
          id: 'field3',
          type: 'Input',
          dataModelBindings: {
            simple: 'Group.prop3',
          },
          textResourceBindings: {
            title: 'Title',
          },
          readOnly: false,
          required: false,
          disabled: false,
        },
      ],
    },
    error: {
      message: null,
      name: null,
    },
    uiConfig: {
      autoSave: true,
      focus: null,
      hiddenFields: [],
      repeatingGroups: null,
      currentView: 'FormLayout',
      navigationConfig: {},
      layoutOrder: [],
    },
  };

  return {
    ...mockFormLayoutState,
    ...customStates,
  };
}
