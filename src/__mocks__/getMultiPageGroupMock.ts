import type { CompGroupRepeatingExternal } from 'src/layout/Group/config.generated';

export const getMultiPageGroupMock = (overrides: Partial<CompGroupRepeatingExternal>): CompGroupRepeatingExternal => ({
  id: 'myMultiPageGroup',
  type: 'Group',
  dataModelBindings: {
    group: 'multipageGroup',
  },
  maxCount: 2,
  edit: {
    multiPage: true,
  },
  children: ['FormLayout:field1', 'FormLayout:field2', 'FormLayout:field3'],
  ...overrides,
});
