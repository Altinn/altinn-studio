import * as React from 'react';

import { getMultiPageGroupMock } from '__mocks__/formLayoutGroupMock';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from 'testUtils';

import { RepeatingGroupsEditContainer } from 'src/features/form/containers/RepeatingGroupsEditContainer';
import { createRepeatingGroupComponents } from 'src/utils/formLayout';
import type { IRepeatingGroupsEditContainer } from 'src/features/form/containers/RepeatingGroupsEditContainer';
import type {
  ILayout,
  ILayoutComponent,
  ILayoutGroup,
  ISelectionComponentProps,
} from 'src/features/form/layout';
import type { IOption } from 'src/types';

import type { ILanguage, ITextResource } from 'altinn-shared/types';

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
  const textResources: ITextResource[] = [
    { id: 'option.label', value: 'Value to be shown' },
  ];
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
  const layout: ILayout = [].concat(multiPageGroup).concat(components);

  const repeatingGroupIndex = 3;
  const repeatingGroupDeepCopyComponents: Array<
    Array<ILayoutComponent | ILayoutGroup>
  > = createRepeatingGroupComponents(
    multiPageGroup,
    components,
    repeatingGroupIndex,
    textResources,
  );

  it('calls setMultiPageIndex when save-and-close is pressed for multipage edit-container', async () => {
    const setMultiPageIndex = jest.fn();
    render({ setMultiPageIndex: setMultiPageIndex });
    await user.click(screen.getByRole('button', { name: /save and close/i }));
    expect(setMultiPageIndex).toHaveBeenCalledTimes(1);
  });

  it('calls setMultiPageIndex when delete is pressed for multipage edit-container with edit.mode showAll', async () => {
    const setMultiPageIndex = jest.fn();
    multiPageGroup.edit.mode = 'showAll';
    render({ setMultiPageIndex: setMultiPageIndex });
    await user.click(screen.getByRole('button', { name: /delete/i }));
    expect(setMultiPageIndex).toHaveBeenCalledTimes(1);
  });

  it('calls setEditIndex when save and open next is pressed when edit.saveAndNextButton is true', async () => {
    const setEditIndex = jest.fn();
    const setMultiPageIndex = jest.fn();
    const onClickSave = jest.fn();
    multiPageGroup.edit.saveAndNextButton = true;
    render({ setEditIndex, setMultiPageIndex, onClickSave, editIndex: 0 });
    await user.click(
      screen.getByRole('button', { name: /save and open next/i }),
    );
    expect(onClickSave).not.toHaveBeenCalled();
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
      onClickSave: jest.fn(),
      onClickRemove: jest.fn(),
      hideDeleteButton: false,
      showSaveAndNextButton: multiPageGroup.edit?.saveAndNextButton === true,
      ...props,
    };

    renderWithProviders(<RepeatingGroupsEditContainer {...allProps} />);
  };
});
