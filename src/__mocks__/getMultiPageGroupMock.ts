import type { CompGroupRepeatingExternal } from 'src/layout/Group/config.generated';

export function getMultiPageGroupMock(id = 'multipageGroup'): CompGroupRepeatingExternal {
  return {
    type: 'Group',
    id,
    dataModelBindings: {
      group: 'multipageGroup',
    },
    maxCount: 2,
    edit: {
      multiPage: true,
    },
    children: ['FormLayout:field1', 'FormLayout:field2', 'FormLayout:field3'],
  };
}
