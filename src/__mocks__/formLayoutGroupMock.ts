import type { ExprUnresolved } from 'src/features/expressions/types';
import type { ILayoutGroup } from 'src/layout/Group/types';

export function getFormLayoutGroupMock(
  customMock?: Partial<ExprUnresolved<ILayoutGroup>>,
  children?: string[],
): ExprUnresolved<ILayoutGroup> {
  const mockLayoutGroup: ExprUnresolved<ILayoutGroup> = {
    id: 'container-closed-id',
    type: 'Group',
    children: children || ['field1', 'field2', 'field3', 'field4'],
    maxCount: 8,
    dataModelBindings: {
      group: 'some-group',
    },
  };
  return {
    ...mockLayoutGroup,
    ...customMock,
  };
}

export function getMultiPageGroupMock(id = 'multipageGroup'): ExprUnresolved<ILayoutGroup> {
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
