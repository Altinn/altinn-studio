import React from 'react';
import { screen, fireEvent } from '@testing-library/react';

import { getInitialStateMock } from '../../../../__mocks__/mocks';
import type { ILayoutGroup } from '../layout';

import { GroupContainer } from './GroupContainer';
import { Triggers } from '../../../types';
import { renderWithProviders } from '../../../../testUtils';
import { setupStore } from 'src/store';

const mockContainer: ILayoutGroup = {
  id: 'container-closed-id',
  type: 'Group',
  children: ['field1', 'field2', 'field3', 'field4'],
  maxCount: 8,
  dataModelBindings: {
    group: 'some-group',
  },
};

interface IRender {
  container?: ILayoutGroup;
}

function render({ container = mockContainer }: IRender = {}) {
  const mockComponents = [
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
  ] as any;

  const mockLayout = {
    layouts: {
      FormLayout: [
        {
          id: 'container-closed-id',
          type: 'group',
          dataModelBindings: {
            group: 'Group',
          },
          children: ['field1', 'field2', 'field3', 'field4'],
        },
        {
          id: 'container-in-edit-mode-id',
          type: 'group',
          dataModelBindings: {
            group: 'Group',
          },
          children: ['field1', 'field2', 'field3', 'field4'],
        },
      ].concat(mockComponents),
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

describe('GroupContainer', () => {
  beforeAll(() => {
    window.matchMedia = jest.fn().mockImplementation((query) => {
      return {
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
      };
    });
  });

  it('should render add new button with custom label when supplied', () => {
    const mockContainerWithLabel: ILayoutGroup = {
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

  it('should trigger validate when closing edit mode if validation trigger is present', () => {
    const mockContainerInEditModeWithTrigger = {
      ...mockContainer,
      id: 'container-in-edit-mode-id',
      triggers: [Triggers.Validation],
    };

    const store = render({ container: mockContainerInEditModeWithTrigger });

    const editButton = screen.getAllByText('Rediger')[0].closest('button');
    fireEvent.click(editButton);

    const mockDispatchedAction = {
      payload: {
        group: 'container-in-edit-mode-id',
        index: -1,
        validate: true,
      },
      type: 'formLayout/updateRepeatingGroupsEditIndex',
    };

    expect(store.dispatch).toHaveBeenCalledTimes(1);
    expect(store.dispatch).toHaveBeenCalledWith(mockDispatchedAction);
  });

  it('should NOT trigger validate when closing edit mode if validation trigger is NOT present', () => {
    const mockContainerInEditMode = {
      ...mockContainer,
      id: 'container-in-edit-mode-id',
    };
    const store = render({ container: mockContainerInEditMode });

    const editButton = screen.getAllByText('Rediger')[0].closest('button');
    fireEvent.click(editButton);

    const mockDispatchedAction = {
      payload: {
        group: 'container-in-edit-mode-id',
        index: -1,
        validate: false,
      },
      type: 'formLayout/updateRepeatingGroupsEditIndex',
    };

    expect(store.dispatch).toHaveBeenCalledTimes(1);
    expect(store.dispatch).toHaveBeenCalledWith(mockDispatchedAction);
  });

  it('should trigger validate when saving if validation trigger is present', () => {
    const mockContainerInEditModeWithTrigger = {
      ...mockContainer,
      id: 'container-in-edit-mode-id',
      triggers: [Triggers.Validation],
    };
    const store = render({ container: mockContainerInEditModeWithTrigger });

    const editButton = screen.getAllByText('Ferdig')[0].closest('button');
    fireEvent.click(editButton);

    const mockDispatchedAction = {
      payload: {
        group: 'container-in-edit-mode-id',
        index: -1,
        validate: true,
      },
      type: 'formLayout/updateRepeatingGroupsEditIndex',
    };

    expect(store.dispatch).toHaveBeenCalledTimes(1);
    expect(store.dispatch).toHaveBeenCalledWith(mockDispatchedAction);
  });

  it('should NOT trigger validate when saving if validation trigger is NOT present', () => {
    const mockContainerInEditMode = {
      ...mockContainer,
      id: 'container-in-edit-mode-id',
    };
    const store = render({ container: mockContainerInEditMode });

    const editButton = screen.getAllByText('Ferdig')[0].closest('button');
    fireEvent.click(editButton);

    const mockDispatchedAction = {
      payload: {
        group: 'container-in-edit-mode-id',
        index: -1,
        validate: false,
      },
      type: 'formLayout/updateRepeatingGroupsEditIndex',
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
