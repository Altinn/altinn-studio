import type { CompGroupRepeatingExternal } from 'src/layout/Group/config.generated';

export const getFormLayoutGroupMock = (
  customMock?: Partial<CompGroupRepeatingExternal>,
): CompGroupRepeatingExternal => ({
  id: 'container-closed-id',
  type: 'Group',
  children: ['field1', 'field2', 'field3', 'field4'],
  maxCount: 8,
  dataModelBindings: {
    group: 'some-group',
  },
  ...customMock,
});
