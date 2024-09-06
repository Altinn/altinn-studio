import { defaultDataTypeMock } from 'src/__mocks__/getLayoutSetsMock';
import type { CompRepeatingGroupExternal } from 'src/layout/RepeatingGroup/config.generated';

export const getMultiPageGroupMock = (overrides: Partial<CompRepeatingGroupExternal>): CompRepeatingGroupExternal => ({
  id: 'myMultiPageGroup',
  type: 'RepeatingGroup',
  dataModelBindings: {
    group: { dataType: defaultDataTypeMock, field: 'multipageGroup' },
  },
  maxCount: 2,
  edit: {
    multiPage: true,
  },
  children: ['0:field1', '1:field2', '2:field3'],
  ...overrides,
});
