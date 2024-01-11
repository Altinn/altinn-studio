import type { ILayout } from 'src/layout/layout';

export function getFormLayoutMock(): ILayout {
  return [
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
  ];
}
