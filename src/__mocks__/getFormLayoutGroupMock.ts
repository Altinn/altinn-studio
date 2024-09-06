import { defaultDataTypeMock } from 'src/__mocks__/getLayoutSetsMock';
import type { CompRepeatingGroupExternal } from 'src/layout/RepeatingGroup/config.generated';

export const getFormLayoutRepeatingGroupMock = (
  customMock?: Partial<CompRepeatingGroupExternal>,
): CompRepeatingGroupExternal => ({
  id: 'container-closed-id',
  type: 'RepeatingGroup',
  children: ['field1', 'field2', 'field3', 'field4'],
  maxCount: 8,
  dataModelBindings: {
    group: { dataType: defaultDataTypeMock, field: 'some-group' },
  },
  ...customMock,
});
