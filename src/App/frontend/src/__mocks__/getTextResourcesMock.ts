import type { IRawTextResource, TextResourceMap } from 'src/features/language/textResources';

export function getTextResourceMapMock(): TextResourceMap {
  return {
    'option.from.rep.group.label': {
      value: 'The value from the group is: {0}',
      variables: [
        {
          dataSource: 'dataModel.default',
          key: 'someGroup[{0}].labelField',
        },
      ],
    },
    'option.from.rep.group.description': {
      value: 'Description: The value from the group is: {0}',
      variables: [
        {
          dataSource: 'dataModel.default',
          key: 'someGroup[{0}].labelField',
        },
      ],
    },
    'option.from.rep.group.helpText': {
      value: 'Help Text: The value from the group is: {0}',
      variables: [
        {
          dataSource: 'dataModel.default',
          key: 'someGroup[{0}].labelField',
        },
      ],
    },
    'accordion.title': { value: 'This is a title' },
    FormLayout: { value: 'This is a page title' },
  };
}

export function getTextResourcesMock(): IRawTextResource[] {
  return [
    {
      id: 'option.from.rep.group.label',
      value: 'The value from the group is: {0}',
      variables: [
        {
          dataSource: 'dataModel.default',
          key: 'someGroup[{0}].labelField',
        },
      ],
    },
    {
      id: 'option.from.rep.group.description',
      value: 'Description: The value from the group is: {0}',
      variables: [
        {
          dataSource: 'dataModel.default',
          key: 'someGroup[{0}].labelField',
        },
      ],
    },
    {
      id: 'option.from.rep.group.helpText',
      value: 'Help Text: The value from the group is: {0}',
      variables: [
        {
          dataSource: 'dataModel.default',
          key: 'someGroup[{0}].labelField',
        },
      ],
    },
    {
      id: 'accordion.title',
      value: 'This is a title',
    },
    {
      id: 'FormLayout',
      value: 'This is a page title',
    },
  ];
}
