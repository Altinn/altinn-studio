import type { IRawTextResource } from 'src/features/language/textResources';

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
      id: 'group.input.title',
      value: 'The value from the group is: {0}',
      variables: [
        {
          dataSource: 'dataModel.default',
          key: 'referencedGroup[{0}].inputField',
        },
      ],
    },
    {
      id: 'group.input.title-2',
      value: 'The value from the group is: Value from input field [2]',
      variables: [
        {
          dataSource: 'dataModel.default',
          key: 'referencedGroup[2].inputField',
        },
      ],
    },
    {
      id: 'accordion.title',
      value: 'This is a title',
    },
  ];
}
