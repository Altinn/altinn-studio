import type { CompGroupRepeatingExternal } from 'src/layout/RepeatingGroup/config.generated';

export const getFormLayoutRepeatingGroupMock = (
  customMock?: Partial<CompGroupRepeatingExternal>,
): CompGroupRepeatingExternal => ({
  id: 'container-closed-id',
  type: 'RepeatingGroup',
  children: ['field1', 'field2', 'field3', 'field4'],
  maxCount: 8,
  dataModelBindings: {
    group: 'some-group',
  },
  ...customMock,
});
