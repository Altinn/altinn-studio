import React from 'react';

import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { getMultiPageGroupMock } from 'src/__mocks__/getMultiPageGroupMock';
import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { RepeatingGroupsEditContainer } from 'src/layout/Group/RepeatingGroupsEditContainer';
import { renderWithNode } from 'src/test/renderWithProviders';
import type { TextResourceMap } from 'src/features/language/textResources';
import type { CompCheckboxesExternal } from 'src/layout/Checkboxes/config.generated';
import type { IOption } from 'src/layout/common.generated';
import type { CompGroupRepeatingInternal } from 'src/layout/Group/config.generated';
import type { LayoutNodeForGroup } from 'src/layout/Group/LayoutNodeForGroup';
import type { IRepeatingGroupsEditContainer } from 'src/layout/Group/RepeatingGroupsEditContainer';
import type { CompExternal, ILayout } from 'src/layout/layout';

const user = userEvent.setup();

describe('RepeatingGroupsEditContainer', () => {
  const multiPageGroup = getMultiPageGroupMock('group');
  const textResources: TextResourceMap = { 'option.label': { value: 'Value to be shown' } };
  const options: IOption[] = [{ value: 'option.value', label: 'option.label' }];
  const components: CompExternal[] = [
    {
      id: 'field1',
      type: 'Input',
      dataModelBindings: {
        simpleBinding: 'Group.prop1',
      },
      textResourceBindings: {
        title: 'Title1',
      },
      readOnly: false,
      required: false,
    },
    {
      id: 'field2',
      type: 'Input',
      dataModelBindings: {
        simpleBinding: 'Group.prop2',
      },
      textResourceBindings: {
        title: 'Title2',
      },
      readOnly: false,
      required: false,
    },
    {
      id: 'field3',
      type: 'Input',
      dataModelBindings: {
        simpleBinding: 'Group.prop3',
      },
      textResourceBindings: {
        title: 'Title3',
      },
      readOnly: false,
      required: false,
    },
    {
      id: 'field4',
      type: 'Checkboxes',
      dataModelBindings: {
        simpleBinding: 'some-group.checkboxBinding',
      },
      textResourceBindings: {
        title: 'Title4',
      },
      readOnly: false,
      required: false,
      disabled: false,
      options,
    } as CompCheckboxesExternal,
  ];
  const layout: ILayout = [multiPageGroup, ...components];

  it('calls setEditIndex when save and open next is pressed when edit.saveAndNextButton is true', async () => {
    const setEditIndex = jest.fn();
    const setMultiPageIndex = jest.fn();
    if (multiPageGroup.edit) {
      multiPageGroup.edit.saveAndNextButton = true;
    }
    await render({ setEditIndex, setMultiPageIndex, editIndex: 0 });
    await user.click(screen.getByRole('button', { name: /Lagre og åpne neste/i }));
    expect(setEditIndex).toHaveBeenCalledWith(1, true);
  });

  const render = async (props: Partial<IRepeatingGroupsEditContainer> = {}) => {
    const allProps: Omit<IRepeatingGroupsEditContainer, 'node'> = {
      editIndex: 1,
      setEditIndex: jest.fn(),
      onClickRemove: jest.fn(),
      ...props,
    };

    const reduxState = getInitialStateMock();
    reduxState.formLayout.layouts = { FormLayout: layout };
    reduxState.textResources.resourceMap = textResources;

    await renderWithNode<LayoutNodeForGroup<CompGroupRepeatingInternal>>({
      nodeId: 'group',
      renderer: ({ node }) => (
        <RepeatingGroupsEditContainer
          node={node}
          {...allProps}
        />
      ),
      reduxState,
    });
  };
});
