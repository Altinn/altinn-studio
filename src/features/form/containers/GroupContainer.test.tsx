import React from 'react';

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PayloadAction } from '@reduxjs/toolkit';

import { getFormLayoutGroupMock } from 'src/__mocks__/formLayoutGroupMock';
import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { GroupContainer } from 'src/features/form/containers/GroupContainer';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { setupStore } from 'src/store';
import { mockMediaQuery, renderWithProviders } from 'src/testUtils';
import { Triggers } from 'src/types';
import type { ExprUnresolved } from 'src/features/expressions/types';
import type {
  IUpdateRepeatingGroupsEditIndex,
  IUpdateRepeatingGroupsMultiPageIndex,
} from 'src/features/form/layout/formLayoutTypes';
import type { ILayoutGroup } from 'src/layout/Group/types';
import type { ComponentInGroup } from 'src/layout/layout';

const mockContainer = getFormLayoutGroupMock();

interface IRender {
  container?: ExprUnresolved<ILayoutGroup>;
}

function render({ container = mockContainer }: IRender = {}) {
  const mockComponents: ExprUnresolved<ComponentInGroup[]> = [
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
      options: [{ value: 'option.value', label: 'option.label' }],
    },
  ];

  const mockLayout = {
    layouts: {
      FormLayout: [
        getFormLayoutGroupMock({
          ...(container.id === 'container-closed-id' ? container : undefined),
          dataModelBindings: {
            group: 'Group',
          },
        }),
        getFormLayoutGroupMock({
          ...(container.id === 'container-in-edit-mode-id' ? container : undefined),
          id: 'container-in-edit-mode-id',
          dataModelBindings: {
            group: 'Group',
          },
        }),
        ...mockComponents,
      ],
    },
    uiConfig: {
      hiddenFields: [],
      repeatingGroups: {
        'container-closed-id': {
          index: 3,
          editIndex: -1,
        },
        'container-in-edit-mode-id': {
          index: 4,
          editIndex: 0,
        },
      },
      autosave: false,
      currentView: 'FormLayout',
    },
  } as any;

  const mockData = {
    formData: {
      'some-group[1].checkboxBinding': 'option.value',
    },
  } as any;

  const mockTextResources = {
    resources: [
      { id: 'option.label', value: 'Value to be shown' },
      { id: 'button.open', value: 'New open text' },
      { id: 'button.close', value: 'New close text' },
      { id: 'button.save', value: 'New save text' },
    ],
  } as any;

  const preloadedState = getInitialStateMock({
    formLayout: mockLayout,
    formData: mockData,
    textResources: mockTextResources,
  });

  const mockStore = setupStore(preloadedState);

  mockStore.dispatch = jest.fn();

  const { store } = renderWithProviders(
    <GroupContainer
      components={mockComponents}
      container={container}
      id={container.id}
      key='testKey'
    />,
    {
      store: mockStore,
    },
  );

  return store;
}

const { setScreenWidth } = mockMediaQuery(992);

describe('GroupContainer', () => {
  beforeAll(() => {
    // Set screen size to desktop
    setScreenWidth(1200);
  });

  it('should render add new button with custom label when supplied', () => {
    const mockContainerWithLabel: ExprUnresolved<ILayoutGroup> = {
      textResourceBindings: {
        add_button: 'person',
      },
      ...mockContainer,
    };
    render({ container: mockContainerWithLabel });

    const item = screen.getByText('Legg til ny person');
    expect(item).toBeInTheDocument();
  });

  it('should not show add button when maxOccurs is reached', () => {
    const mockContainerWithMaxCount = {
      ...mockContainer,
      maxCount: 3,
    };
    render({ container: mockContainerWithMaxCount });

    const addButton = screen.queryByText('Legg til ny');
    expect(addButton).not.toBeInTheDocument();
  });

  it('should show option label when displaying selection components', () => {
    render();

    const item = screen.getByText('Value to be shown');
    expect(item).toBeInTheDocument();
  });

  it('calls setMultiPageIndex when opening a group', async () => {
    const user = userEvent.setup();
    const multiPageContainer: ExprUnresolved<ILayoutGroup> = {
      ...mockContainer,
      edit: {
        ...mockContainer.edit,
        multiPage: true,
      },
    };
    const store = render({ container: multiPageContainer });

    const editButton = screen.getAllByRole('button', {
      name: /Rediger/i,
    })[0];
    await user.click(editButton);

    const mockDispatchedAction: PayloadAction<IUpdateRepeatingGroupsMultiPageIndex> = {
      payload: {
        group: 'container-closed-id',
        index: 0,
      },
      type: FormLayoutActions.updateRepeatingGroupsMultiPageIndex.type,
    };

    expect(store.dispatch).toHaveBeenLastCalledWith(mockDispatchedAction);
  });

  it('calls setMultiPageIndex when adding a group element', async () => {
    const user = userEvent.setup();
    const multiPageContainer: ExprUnresolved<ILayoutGroup> = {
      ...mockContainer,
      edit: {
        ...mockContainer.edit,
        multiPage: true,
      },
    };
    const store = render({ container: multiPageContainer });

    const addButton = screen.getAllByRole('button', {
      name: /Legg til ny/i,
    })[0];
    await user.click(addButton);

    const mockDispatchedAction: PayloadAction<IUpdateRepeatingGroupsMultiPageIndex> = {
      payload: {
        group: 'container-closed-id',
        index: 0,
      },
      type: FormLayoutActions.updateRepeatingGroupsMultiPageIndex.type,
    };

    expect(store.dispatch).toHaveBeenLastCalledWith(mockDispatchedAction);
  });

  it('should trigger validate when closing edit mode if validation trigger is present', async () => {
    const mockContainerInEditModeWithTrigger = {
      ...mockContainer,
      id: 'container-in-edit-mode-id',
      triggers: [Triggers.Validation],
    };
    const user = userEvent.setup();
    const store = render({ container: mockContainerInEditModeWithTrigger });

    const editButton = screen.getAllByRole('button', {
      name: /Lagre og lukk/i,
    })[0];
    await user.click(editButton);

    const mockDispatchedAction: PayloadAction<IUpdateRepeatingGroupsEditIndex> = {
      payload: {
        group: 'container-in-edit-mode-id',
        index: -1,
        validate: Triggers.Validation,
      },
      type: FormLayoutActions.updateRepeatingGroupsEditIndex.type,
    };

    expect(store.dispatch).toHaveBeenCalledTimes(1);
    expect(store.dispatch).toHaveBeenCalledWith(mockDispatchedAction);
  });

  it('should NOT trigger validate when closing edit mode if validation trigger is NOT present', async () => {
    const mockContainerInEditMode = {
      ...mockContainer,
      id: 'container-in-edit-mode-id',
    };
    const store = render({ container: mockContainerInEditMode });
    const user = userEvent.setup();

    const editButton = screen.getAllByRole('button', {
      name: /Lagre og lukk/i,
    })[0];
    await user.click(editButton);

    const mockDispatchedAction: PayloadAction<IUpdateRepeatingGroupsEditIndex> = {
      payload: {
        group: 'container-in-edit-mode-id',
        index: -1,
      },
      type: FormLayoutActions.updateRepeatingGroupsEditIndex.type,
    };

    expect(store.dispatch).toHaveBeenCalledTimes(1);
    expect(store.dispatch).toHaveBeenCalledWith(mockDispatchedAction);
  });

  it('should trigger validate when saving if validation trigger is present', async () => {
    const mockContainerInEditModeWithTrigger = {
      ...mockContainer,
      id: 'container-in-edit-mode-id',
      triggers: [Triggers.Validation],
    };
    const store = render({ container: mockContainerInEditModeWithTrigger });
    const user = userEvent.setup();

    const editButton = screen.getAllByRole('button', {
      name: /Lagre og lukk/i,
    })[1];
    await user.click(editButton);

    const mockDispatchedAction: PayloadAction<IUpdateRepeatingGroupsEditIndex> = {
      payload: {
        group: 'container-in-edit-mode-id',
        index: -1,
        validate: Triggers.Validation,
      },
      type: FormLayoutActions.updateRepeatingGroupsEditIndex.type,
    };

    expect(store.dispatch).toHaveBeenCalledTimes(1);
    expect(store.dispatch).toHaveBeenCalledWith(mockDispatchedAction);
  });

  it('should trigger validate when saving if validateRow trigger is present', async () => {
    const mockContainerInEditModeWithTrigger = {
      ...mockContainer,
      id: 'container-in-edit-mode-id',
      triggers: [Triggers.ValidateRow],
    };
    const store = render({ container: mockContainerInEditModeWithTrigger });
    const user = userEvent.setup();

    const editButton = screen.getAllByRole('button', {
      name: /Lagre og lukk/i,
    })[1];
    await user.click(editButton);

    const mockDispatchedAction: PayloadAction<IUpdateRepeatingGroupsEditIndex> = {
      payload: {
        group: 'container-in-edit-mode-id',
        index: -1,
        validate: Triggers.ValidateRow,
      },
      type: FormLayoutActions.updateRepeatingGroupsEditIndex.type,
    };

    expect(store.dispatch).toHaveBeenCalledTimes(1);
    expect(store.dispatch).toHaveBeenCalledWith(mockDispatchedAction);
  });

  it('should NOT trigger validate when saving if validation trigger is NOT present', async () => {
    const mockContainerInEditMode = {
      ...mockContainer,
      id: 'container-in-edit-mode-id',
    };
    const store = render({ container: mockContainerInEditMode });
    const user = userEvent.setup();

    const editButton = screen.getAllByRole('button', {
      name: /Lagre og lukk/i,
    })[1];
    await user.click(editButton);

    const mockDispatchedAction: PayloadAction<IUpdateRepeatingGroupsEditIndex> = {
      payload: {
        group: 'container-in-edit-mode-id',
        index: -1,
      },
      type: FormLayoutActions.updateRepeatingGroupsEditIndex.type,
    };

    expect(store.dispatch).toHaveBeenCalledTimes(1);
    expect(store.dispatch).toHaveBeenCalledWith(mockDispatchedAction);
  });

  it('should display "Add new" button when edit.addButton is undefined', () => {
    render();

    const addButton = screen.getByText('Legg til ny');
    expect(addButton).toBeInTheDocument();
  });

  it('should not display "Add new" button when edit.addButton is false', () => {
    const mockContainerDisabledAddButton = {
      ...mockContainer,
      edit: {
        addButton: false,
      },
    };
    render({ container: mockContainerDisabledAddButton });

    const addButton = screen.queryByText('Legg til ny');
    expect(addButton).not.toBeInTheDocument();
  });

  it('should display "Add new" button when edit.addButton is true', () => {
    const mockContainerDisabledAddButton = {
      ...mockContainer,
      edit: {
        addButton: true,
      },
    };
    render({ container: mockContainerDisabledAddButton });

    const addButton = screen.getByText('Legg til ny');
    expect(addButton).toBeInTheDocument();
  });

  it('should display textResourceBindings.edit_button_open as edit button if present when opening', () => {
    const mockContainerWithEditButtonOpen = {
      ...mockContainer,
      textResourceBindings: {
        edit_button_open: 'button.open',
      },
    };
    render({ container: mockContainerWithEditButtonOpen });

    const openButtons = screen.getAllByText('New open text');
    expect(openButtons).toHaveLength(4);
  });

  it('should display textResourceBindings.edit_button_close as edit button if present when closing', () => {
    const mockContainerWithEditButtonClose = {
      ...mockContainer,
      id: 'container-in-edit-mode-id',
      textResourceBindings: {
        edit_button_close: 'button.close',
      },
    };
    render({ container: mockContainerWithEditButtonClose });

    const closeButtons = screen.getAllByText('New close text');
    expect(closeButtons).toHaveLength(1);
  });

  it('should display textResourceBindings.save_button as save button if present', () => {
    const mockContainerWithAddButton = {
      ...mockContainer,
      id: 'container-in-edit-mode-id',
      textResourceBindings: {
        save_button: 'button.save',
      },
    };
    render({ container: mockContainerWithAddButton });

    const saveButton = screen.getByText('New save text');
    expect(saveButton).toBeInTheDocument();
  });
});
