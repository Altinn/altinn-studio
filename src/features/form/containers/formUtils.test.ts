import { getFormLayoutGroupMock, getFormLayoutStateMock, getMultiPageGroupMock } from '__mocks__/mocks';

import { mapGroupComponents } from 'src/features/form/containers/formUtils';
import type { ILayout, ILayoutGroup } from 'src/features/form/layout';

describe('formUtils/mapGroupComponents', () => {
  const makeFormLayout = () => {
    const formLayoutState = getFormLayoutStateMock();
    return formLayoutState.layouts?.FormLayout as ILayout;
  };
  const oc = expect.objectContaining;
  it('should map multi-page groups', () => {
    const formLayout = makeFormLayout();
    formLayout[0] = getMultiPageGroupMock() as ILayoutGroup;
    const group = formLayout[0];
    const result = mapGroupComponents(group, formLayout);
    expect(result).toStrictEqual([
      oc({
        id: 'field1',
      }),
      oc({
        id: 'field2',
      }),
      oc({
        id: 'field3',
      }),
    ]);
  });
  it('should map groupComponents with several members', () => {
    const formLayout = makeFormLayout();
    formLayout[0] = getFormLayoutGroupMock({}, ['field1', 'field2', 'field3']);
    const group = formLayout[0];
    const result = mapGroupComponents(group, formLayout);
    expect(result).toStrictEqual([
      oc({
        id: 'field1',
      }),
      oc({
        id: 'field2',
      }),
      {
        dataModelBindings: { simpleBinding: 'Group.prop3' },
        disabled: false,
        id: 'field3',
        readOnly: false,
        required: false,
        textResourceBindings: { title: 'Title' },
        type: 'Input',
      },
    ]);
  });
  it('should map groupComponents with one element', () => {
    const formLayout = makeFormLayout();
    const group = formLayout[0] as ILayoutGroup;
    const result = mapGroupComponents(group, formLayout);
    expect(result).toStrictEqual([
      {
        id: 'referenced-group-child',
        type: 'Input',
        dataModelBindings: { simpleBinding: 'referencedGroup.field1' },
        textResourceBindings: { title: 'Referenced Group Input' },
        readOnly: false,
        required: false,
        disabled: false,
      },
    ]);
  });
});
