import type { CompRepeatingGroupExternal } from '@app/layout-contract/generated/components/RepeatingGroup/config.generated';

import { defaultDataTypeMock } from 'src/__mocks__/getUiConfigMock';

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
