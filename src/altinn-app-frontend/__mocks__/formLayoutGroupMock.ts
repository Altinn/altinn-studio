import type { ILayoutGroup } from 'src/features/form/layout';

export function getFormLayoutGroupMock(
  customMock?: Partial<ILayoutGroup>,
  children?: string[],
): ILayoutGroup {
  const mockLayoutGroup: ILayoutGroup = {
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

export function getMultiPageGroupMock(): ILayoutGroup {
  return {
    type: 'Group',
    id: 'multipageGroup',
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
