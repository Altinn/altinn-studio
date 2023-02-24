import React from 'react';

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { getMultiPageGroupMock } from 'src/__mocks__/formLayoutGroupMock';
import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { RepeatingGroupsEditContainer } from 'src/features/form/containers/RepeatingGroupsEditContainer';
import { renderWithProviders } from 'src/testUtils';
import { createRepeatingGroupComponents } from 'src/utils/formLayout';
import type { ExprUnresolved } from 'src/features/expressions/types';
import type { IRepeatingGroupsEditContainer } from 'src/features/form/containers/RepeatingGroupsEditContainer';
import type { ILayoutCompCheckboxes } from 'src/layout/Checkboxes/types';
import type { ILayout, ILayoutComponent } from 'src/layout/layout';
import type { RootState } from 'src/store';
import type { IOption } from 'src/types';
import type { ILanguage, ITextResource } from 'src/types/shared';

const user = userEvent.setup();

describe('RepeatingGroupsEditContainer', () => {
  const multiPageGroup = getMultiPageGroupMock();
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
  const components: ExprUnresolved<ILayoutComponent>[] = [
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
    } as ExprUnresolved<ILayoutCompCheckboxes>,
  ];
  const layout: ILayout = [multiPageGroup, ...components];

  const repeatingGroupIndex = 3;
  const repeatingGroupDeepCopyComponents = createRepeatingGroupComponents(
    multiPageGroup,
    components,
    repeatingGroupIndex,
    textResources,
  );

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
      ...props,
    };

    const preloadedState = getInitialStateMock() as RootState;
    preloadedState.formLayout.layouts = { FormLayout: layout };
    preloadedState.language.language = language;
    preloadedState.textResources.resources = textResources;

    renderWithProviders(<RepeatingGroupsEditContainer {...allProps} />, { preloadedState });
  };
});
