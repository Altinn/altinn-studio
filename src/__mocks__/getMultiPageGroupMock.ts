import type { CompRepeatingGroupExternal } from 'src/layout/RepeatingGroup/config.generated';

export const getMultiPageGroupMock = (overrides: Partial<CompRepeatingGroupExternal>): CompRepeatingGroupExternal => ({
  id: 'myMultiPageGroup',
  type: 'RepeatingGroup',
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
