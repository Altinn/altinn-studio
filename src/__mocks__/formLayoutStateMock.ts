import { getUiConfigStateMock } from 'src/__mocks__/uiConfigStateMock';
import type { ILayoutState } from 'src/features/layout/formLayoutSlice';

export function getFormLayoutStateMock(customStates?: Partial<ILayoutState>): ILayoutState {
  const mockFormLayoutState: ILayoutState = {
    layouts: {
      FormLayout: [
        {
          id: 'referencedGroup',
          type: 'Group',
          dataModelBindings: {
            group: 'referencedGroup',
          },
          children: ['referenced-group-child'],
        },
        {
          id: 'referenced-group-child',
          type: 'Input',
          dataModelBindings: {
            simpleBinding: 'referencedGroup.field1',
          },
          textResourceBindings: {
            title: 'Referenced Group Input',
          },
          readOnly: false,
          required: false,
        },
        {
          id: 'field1',
          type: 'Input',
          dataModelBindings: {
            simpleBinding: 'Group.prop1',
          },
          textResourceBindings: {
            title: 'Title',
          },
          readOnly: false,
          required: false,
        },
        {
          id: 'field2',
          type: 'Input',
          dataModelBindings: {
            simpleBinding: 'Group.prop2',
          },
          textResourceBindings: {
            title: 'Title',
          },
          readOnly: false,
          required: false,
        },
        {
          id: 'field3',
          type: 'Input',
          dataModelBindings: {
            simpleBinding: 'Group.prop3',
          },
          textResourceBindings: {
            title: 'Title',
          },
          readOnly: false,
          required: false,
        },
      ],
    },
    error: null,
    uiConfig: getUiConfigStateMock(),
    layoutsets: null,
    layoutSetId: null,
  };

  return {
    ...mockFormLayoutState,
    ...customStates,
  };
}
