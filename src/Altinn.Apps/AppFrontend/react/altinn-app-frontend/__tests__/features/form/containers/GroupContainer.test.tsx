/* eslint-disable max-len */
/* eslint-disable no-undef */

import 'jest';
import * as React from 'react';
import { fireEvent, render } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { Provider } from 'react-redux';
import configureStore, { MockStoreEnhanced } from 'redux-mock-store';
import { GroupContainer } from '../../../../src/features/form/containers/GroupContainer';
import { getInitialStateMock } from '../../../../__mocks__/mocks';
import { ILayoutGroup } from '../../../../src/features/form/layout';
import { Triggers } from '../../../../src/types';

describe('features > form > containers > GroupContainer.tsx', () => {
  let mockStore: MockStoreEnhanced<unknown, unknown>;
  let mockLayout: any;
  let mockData: any;
  let mockComponents: any;
  let mockTextResources: any;
  let mockContainer: ILayoutGroup;

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

  beforeEach(() => {
    const createStore = configureStore();
    mockComponents = [
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

    mockLayout = {
      layouts: {
        FormLayout: [
          {
            id: 'container-closed-id',
            type: 'group',
            dataModelBindings: {
              group: 'Group',
            },
            children: [
              'field1',
              'field2',
              'field3',
              'field4',
            ],
          },
          {
            id: 'container-in-edit-mode-id',
            type: 'group',
            dataModelBindings: {
              group: 'Group',
            },
            children: [
              'field1',
              'field2',
              'field3',
              'field4',
            ],
          },
        ].concat(mockComponents),
      },
      uiConfig: {
        hiddenFields: [],
        repeatingGroups: {
          'container-closed-id': {
            count: 3,
            editIndex: -1,
          },
          'container-in-edit-mode-id': {
            count: 4,
            editIndex: 0,
          }
        },
        autosave: false,
        currentView: 'FormLayout',
      },
    };

    mockContainer = {
      id: 'container-closed-id',
      type: 'Group',
      children: [
        'field1',
        'field2',
        'field3',
        'field4',
      ],
      maxCount: 8,
      dataModelBindings: {
        group: 'some-group',
      },
    };

    mockData = {
      formData: {
        'some-group[1].checkboxBinding': 'option.value',
      },
    };

    mockTextResources = {
      resources: [
        { id: 'option.label', value: 'Value to be shown' },
        { id: 'button.open', value: 'New open text' },
        { id: 'button.close', value: 'New close text' },
        { id: 'button.save', value: 'New save text' },
      ],
    };

    const initialState = getInitialStateMock({
      formLayout: mockLayout,
      formData: mockData,
      textResources: mockTextResources,
    });
    mockStore = createStore(initialState);
    mockStore.dispatch = jest.fn();
  });

  function renderComponent(container: ILayoutGroup) {
    return render(
      <Provider store={mockStore}>
        <GroupContainer
          components={mockComponents}
          container={container}
          id={container.id}
          key='testKey'
        />
      </Provider>,
    );
  }

  it('should render add new button', async () => {
    const utils = renderComponent(mockContainer);
    const item = await utils.findByText('Legg til ny');
    expect(item).not.toBe(null);
  });

  it('should render add new button with custom label when supplied', async () => {
    const mockContainerWithLabel: ILayoutGroup = {
      textResourceBindings: {
        add_button: 'person',
      },
      ...mockContainer,
    };
    const utils = renderComponent(mockContainerWithLabel)
    const item = await utils.findByText('Legg til ny person');
    expect(item).not.toBeNull();
  });

  it('should not show add button when maxOccurs is reached', () => {
    const mockContainerWithMaxCount = {
      ...mockContainer,
      maxCount: 3,
    };
    const utils = renderComponent(mockContainerWithMaxCount)
    const addButton = utils.queryByText('Legg til ny');
    expect(addButton).toBeNull();
  });

  it('should show option label when displaying selection components', async () => {
    const utils = renderComponent(mockContainer);
    const item = await utils.findByText('Value to be shown');
    expect(item).not.toBeNull();
  });

  it('should trigger validate when closing edit mode if validation trigger is present', () => {
    const mockContainerInEditModeWithTrigger = {
      ...mockContainer,
      id: 'container-in-edit-mode-id',
      triggers: [Triggers.Validation]
    };
    const utils = renderComponent(mockContainerInEditModeWithTrigger)
    const editButton = utils.getAllByText('Rediger')[0].closest('button');
    fireEvent.click(editButton);

    const mockDispatchedAction =
    {
      payload: {
        group: 'container-in-edit-mode-id',
        index: -1,
        validate: true
      },
      type: 'formLayout/updateRepeatingGroupsEditIndex'
    };

    expect(mockStore.dispatch).toHaveBeenCalledTimes(1)
    expect(mockStore.dispatch).toHaveBeenCalledWith(mockDispatchedAction);
  });


  it('should NOT trigger validate when closing edit mode if validation trigger is NOT present', () => {
    const mockContainerInEditMode = {
      ...mockContainer,
      id: 'container-in-edit-mode-id',
    };
    const utils = renderComponent(mockContainerInEditMode)

    const editButton = utils.getAllByText('Rediger')[0].closest('button');
    fireEvent.click(editButton);

    const mockDispatchedAction =
    {
      payload: {
        group: 'container-in-edit-mode-id',
        index: -1,
        validate: false
      },
      type: 'formLayout/updateRepeatingGroupsEditIndex'
    };

    expect(mockStore.dispatch).toHaveBeenCalledTimes(1)
    expect(mockStore.dispatch).toHaveBeenCalledWith(mockDispatchedAction);
  });

  it('should trigger validate when saving if validation trigger is present', () => {
    const mockContainerInEditModeWithTrigger = {
      ...mockContainer,
      id: 'container-in-edit-mode-id',
      triggers: [Triggers.Validation]
    };
    const utils = renderComponent(mockContainerInEditModeWithTrigger);

    const editButton = utils.getAllByText('Lagre')[0].closest('button');
    fireEvent.click(editButton);

    const mockDispatchedAction =
    {
      payload: {
        group: 'container-in-edit-mode-id',
        index: -1,
        validate: true
      },
      type: 'formLayout/updateRepeatingGroupsEditIndex'
    };

    expect(mockStore.dispatch).toHaveBeenCalledTimes(1)
    expect(mockStore.dispatch).toHaveBeenCalledWith(mockDispatchedAction);
  });

  it('should NOT trigger validate when saving if validation trigger is NOT present', () => {
    const mockContainerInEditMode = {
      ...mockContainer,
      id: 'container-in-edit-mode-id',
    };
    const utils = renderComponent(mockContainerInEditMode)

    const editButton = utils.getAllByText('Lagre')[0].closest('button');
    fireEvent.click(editButton);

    const mockDispatchedAction =
    {
      payload: {
        group: 'container-in-edit-mode-id',
        index: -1,
        validate: false
      },
      type: 'formLayout/updateRepeatingGroupsEditIndex'
    };

    expect(mockStore.dispatch).toHaveBeenCalledTimes(1)
    expect(mockStore.dispatch).toHaveBeenCalledWith(mockDispatchedAction);
  });

  it('should not display "Add new" button when edit.addButton is false', () => {
    const mockContainerDisabledAddButton = {
      ...mockContainer,
      edit: {
        addButton: false
      },
    };
    const utils = renderComponent(mockContainerDisabledAddButton);
    const addButton = utils.queryByText('Legg til ny');
    expect(addButton).toBeNull();
  });

  it('should display "Add new" button when edit.addButton is true', () => {
    const mockContainerDisabledAddButton = {
      ...mockContainer,
      edit: {
        addButton: true
      },
    };
    const utils = renderComponent(mockContainerDisabledAddButton);
    const addButton = utils.queryByText('Legg til ny');
    expect(addButton).not.toBeNull();
  });

  it('should display "Add new" button when edit.addButton is undefined', () => {
    const utils = renderComponent(mockContainer);
    const addButton = utils.queryByText('Legg til ny');
    expect(addButton).not.toBeNull();
  });

  it('should display textResourceBindings.edit_button_open as edit button if present when opening', () => {
    const mockContainerWithEditButtonOpen = {
      ...mockContainer,
      textResourceBindings: {
        edit_button_open: 'button.open' // referencing a text resource
      }
    }
    const utils = renderComponent(mockContainerWithEditButtonOpen);
    const openButtons = utils.queryAllByText('New open text');
    expect(openButtons).toHaveLength(4);
  });

  it('should display textResourceBindings.edit_button_close as edit button if present when closing', () => {
    const mockContainerWithEditButtonClose = {
      ...mockContainer,
      id: 'container-in-edit-mode-id',
      textResourceBindings: {
        edit_button_close: 'button.close' // referencing a text resource
      }
    }
    const utils = renderComponent(mockContainerWithEditButtonClose);
    const closeButtons = utils.queryAllByText('New close text');
    expect(closeButtons).toHaveLength(1);
  });

  it('should display textResourceBindings.save_button as save button if present', () => {
    const mockContainerWithAddButton = {
      ...mockContainer,
      id: 'container-in-edit-mode-id',
      textResourceBindings: {
        save_button: 'button.save' // referencing a text resource
      }
    }
    const utils = renderComponent(mockContainerWithAddButton);
    const saveButton = utils.queryByText('New save text');
    expect(saveButton).not.toBeNull();
  });

});
