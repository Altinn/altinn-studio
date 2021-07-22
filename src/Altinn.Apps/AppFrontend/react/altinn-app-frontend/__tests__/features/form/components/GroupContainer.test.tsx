/* eslint-disable max-len */
/* eslint-disable no-undef */
/* tslint:disable:jsx-wrap-multiline */
import 'jest';
import * as React from 'react';
import { fireEvent, render } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { Provider } from 'react-redux';
import * as renderer from 'react-test-renderer';
import configureStore, { MockStoreEnhanced } from 'redux-mock-store';
import { GroupContainer } from '../../../../src/features/form/containers/GroupContainer';
import { getInitialStateMock } from '../../../../__mocks__/mocks';
import { ILayoutGroup } from '../../../../src/features/form/layout';
import { Triggers } from '../../../../src/types';

describe('>>> features/form/components/Group.tsx', () => {
  let mockStore: MockStoreEnhanced<unknown, {}>;
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
            id: 'mock-container-id',
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
            id: 'mock-container-id-2',
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
          'mock-container-id': {
            count: 3,
            editIndex: -1,
          },
          'mock-container-id-2': {
            count: 4,
            editIndex: 0,
          }
        },
        autosave: false,
        currentView: 'FormLayout',
      },
    };

    mockContainer = {
      id: 'mock-container-id',
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
      resources: [{ id: 'option.label', value: 'Value to be shown' }],
    };

    const initialState = getInitialStateMock({
      formLayout: mockLayout,
      formData: mockData,
      textResources: mockTextResources,
    });
    mockStore = createStore(initialState);
    mockStore.dispatch = jest.fn();
  });

  it('+++ should match snapshot', () => {
    const rendered = renderer.create(
      <Provider store={mockStore}>
        <GroupContainer
          components={mockComponents}
          id='mock-container-id'
          key='testKey'
          container={mockContainer}
        />
      </Provider>,
    );
    expect(rendered).toMatchSnapshot();
  });

  it('+++ should render add new button', async () => {
    const utils = render(
      <Provider store={mockStore}>
        <GroupContainer
          components={mockComponents}
          container={mockContainer}
          id='mock-container-id'
          key='testKey'
        />
      </Provider>,
    );
    const item = await utils.findByText('Legg til ny');
    expect(item).not.toBe(null);
  });

  it('+++ should render add new button with custom label when supplied', async () => {
    const mockContainerWithLabel: ILayoutGroup = {
      textResourceBindings: {
        add_button: 'person',
      },
      ...mockContainer,
    };
    const utils = render(
      <Provider store={mockStore}>
        <GroupContainer
          container={mockContainerWithLabel}
          components={mockComponents}
          id='mock-container-id'
          key='testKey'
        />
      </Provider>,
    );
    const item = await utils.findByText('Legg til ny person');
    expect(item).not.toBeNull();
  });

  it('+++ should not show add button when maxOccurs is reached', () => {
    const mockContainerWithMaxCount = {
      ...mockContainer,
      maxCount: 3,
    };
    const utils = render(
      <Provider store={mockStore}>
        <GroupContainer
          components={mockComponents}
          container={mockContainerWithMaxCount}
          id='mock-container-id'
          key='testKey'
        />
      </Provider>,
    );
    const addButton = utils.queryByText('Legg til ny');
    expect(addButton).toBeNull();
  });

  it('+++ should show option label when displaying selection components', async () => {
    const utils = render(
      <Provider store={mockStore}>
        <GroupContainer
          components={mockComponents}
          container={mockContainer}
          id='mock-container-id'
          key='testKey'
        />
      </Provider>,
    );
    const item = await utils.findByText('Value to be shown');
    expect(item).not.toBeNull();
  });

  it('+++ should trigger validate when closing edit mode if validation trigger is present', () => {
    const mockContainerInEditModeWithTrigger = {
      ...mockContainer,
      id: 'mock-container-id-2',
      triggers: [Triggers.Validation]
    };
    const utils = render(
      <Provider store={mockStore}>
        <GroupContainer
          components={mockComponents}
          container={mockContainerInEditModeWithTrigger}
          id='mock-container-id-2'
          key='testKey'
        />
      </Provider>,
    );
    const editButton = utils.getAllByText('Rediger')[0].closest('button');
    fireEvent.click(editButton);

    const mockDispatchedAction =
      {
        payload: {
          group: 'mock-container-id-2',
          index: -1,
          validate: true
        },
        type: 'formLayout/updateRepeatingGroupsEditIndex'
      };

    expect(mockStore.dispatch).toHaveBeenCalledTimes(1)
    expect(mockStore.dispatch).toHaveBeenCalledWith(mockDispatchedAction);
  });

  it('+++ should NOT trigger validate when closing edit mode if validation trigger is NOT present', () => {
    const mockContainerInEditMode = {
      ...mockContainer,
      id: 'mock-container-id-2',
    };
    const utils = render(
      <Provider store={mockStore}>
        <GroupContainer
          components={mockComponents}
          container={mockContainerInEditMode}
          id='mock-container-id-2'
          key='testKey'
        />
      </Provider>,
    );
    const editButton = utils.getAllByText('Rediger')[0].closest('button');
    fireEvent.click(editButton);

    const mockDispatchedAction =
      {
        payload: {
          group: 'mock-container-id-2',
          index: -1,
          validate: false
        },
        type: 'formLayout/updateRepeatingGroupsEditIndex'
      };

    expect(mockStore.dispatch).toHaveBeenCalledTimes(1)
    expect(mockStore.dispatch).toHaveBeenCalledWith(mockDispatchedAction);
  });

  it('+++ should trigger validate when saving if validation trigger is present', () => {
    const mockContainerInEditModeWithTrigger = {
      ...mockContainer,
      id: 'mock-container-id-2',
      triggers: [Triggers.Validation]
    };
    const utils = render(
      <Provider store={mockStore}>
        <GroupContainer
          components={mockComponents}
          container={mockContainerInEditModeWithTrigger}
          id='mock-container-id-2'
          key='testKey'
        />
      </Provider>,
    );
    const editButton = utils.getAllByText('Lagre')[0].closest('button');
    fireEvent.click(editButton);

    const mockDispatchedAction =
      {
        payload: {
          group: 'mock-container-id-2',
          index: -1,
          validate: true
        },
        type: 'formLayout/updateRepeatingGroupsEditIndex'
      };

    expect(mockStore.dispatch).toHaveBeenCalledTimes(1)
    expect(mockStore.dispatch).toHaveBeenCalledWith(mockDispatchedAction);
  });

  it('+++ should NOT trigger validate when saving if validation trigger is NOT present', () => {
    const mockContainerInEditMode = {
      ...mockContainer,
      id: 'mock-container-id-2',
    };
    const utils = render(
      <Provider store={mockStore}>
        <GroupContainer
          components={mockComponents}
          container={mockContainerInEditMode}
          id='mock-container-id-2'
          key='testKey'
        />
      </Provider>,
    );
    const editButton = utils.getAllByText('Lagre')[0].closest('button');
    fireEvent.click(editButton);

    const mockDispatchedAction =
      {
        payload: {
          group: 'mock-container-id-2',
          index: -1,
          validate: false
        },
        type: 'formLayout/updateRepeatingGroupsEditIndex'
      };

    expect(mockStore.dispatch).toHaveBeenCalledTimes(1)
    expect(mockStore.dispatch).toHaveBeenCalledWith(mockDispatchedAction);
  });
});
