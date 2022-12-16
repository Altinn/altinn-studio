import * as React from 'react';

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { getMultiPageGroupMock } from 'src/__mocks__/formLayoutGroupMock';
import { RepeatingGroupsEditContainer } from 'src/features/form/containers/RepeatingGroupsEditContainer';
import { renderWithProviders } from 'src/testUtils';
import { createRepeatingGroupComponents } from 'src/utils/formLayout';
import type { IRepeatingGroupsEditContainer } from 'src/features/form/containers/RepeatingGroupsEditContainer';
import type { ILayoutGroup } from 'src/layout/Group/types';
import type { ILayout, ILayoutComponent, ISelectionComponentProps } from 'src/layout/layout';
import type { IOption } from 'src/types';
import type { ILanguage, ITextResource } from 'src/types/shared';

const user = userEvent.setup();

describe('RepeatingGroupsEditContainer', () => {
  const multiPageGroup: ILayoutGroup = getMultiPageGroupMock();
  const language: ILanguage = {
    general: {
      delete: 'Delete',
      edit_alt: 'Edit',
      save_and_close: 'Save and close',
      save_and_next: 'Save and open next',
    },
  };
  const textResources: ITextResource[] = [{ id: 'option.label', value: 'Value to be shown' }];
  const options: IOption[] = [{ value: 'option.value', label: 'option.label' }];
  const components: ILayoutComponent[] = [
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
      disabled: false,
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
      disabled: false,
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
      disabled: false,
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
      options: options,
    } as ISelectionComponentProps,
  ];
  const layout: ILayout = [multiPageGroup, ...components];

  const repeatingGroupIndex = 3;
  const repeatingGroupDeepCopyComponents: Array<Array<ILayoutComponent | ILayoutGroup>> =
    createRepeatingGroupComponents(multiPageGroup, components, repeatingGroupIndex, textResources);

  it('calls setEditIndex when save and open next is pressed when edit.saveAndNextButton is true', async () => {
    const setEditIndex = jest.fn();
    const setMultiPageIndex = jest.fn();
    if (multiPageGroup.edit) {
      multiPageGroup.edit.saveAndNextButton = true;
    }
    render({ setEditIndex, setMultiPageIndex, editIndex: 0 });
    await user.click(screen.getByRole('button', { name: /save and open next/i }));
    expect(setEditIndex).toHaveBeenCalledWith(1, true);
  });

  const render = (props: Partial<IRepeatingGroupsEditContainer> = {}) => {
    const allProps: IRepeatingGroupsEditContainer = {
      id: 'multipageGroup',
      container: multiPageGroup,
      repeatingGroupDeepCopyComponents: repeatingGroupDeepCopyComponents,
      language: language,
      textResources: textResources,
      layout: layout,
      editIndex: 1,
      repeatingGroupIndex: repeatingGroupIndex,
      setEditIndex: jest.fn(),
      onClickRemove: jest.fn(),
      hideDeleteButton: false,
      showSaveAndNextButton: multiPageGroup.edit?.saveAndNextButton === true,
      ...props,
    };

    renderWithProviders(<RepeatingGroupsEditContainer {...allProps} />);
  };
});
