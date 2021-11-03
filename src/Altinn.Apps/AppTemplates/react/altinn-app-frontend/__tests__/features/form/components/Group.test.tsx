/* eslint-disable no-undef */

import 'jest';
import * as React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { Provider } from 'react-redux';
import * as renderer from 'react-test-renderer';
import configureStore from 'redux-mock-store';
import { Group } from '../../../../src/features/form/containers/Group';
import { getInitialStateMock } from '../../../../__mocks__/mocks';

describe('>>> features/form/components/Group.tsx', () => {
  let mockStore: any;
  let mockLayout: any;
  let mockComponents: any;

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
          simple: 'Group.prop1',
        },
        textResourceBindings: {
          title: 'Title',
        },
        readOnly: false,
        required: false,
        disabled: false,
      },
      {
        id: 'field2',
        type: 'Input',
        dataModelBindings: {
          simple: 'Group.prop2',
        },
        textResourceBindings: {
          title: 'Title',
        },
        readOnly: false,
        required: false,
        disabled: false,
      },
      {
        id: 'field3',
        type: 'Input',
        dataModelBindings: {
          simple: 'Group.prop3',
        },
        textResourceBindings: {
          title: 'Title',
        },
        readOnly: false,
        required: false,
        disabled: false,
      },
    ];

    mockLayout = {
      layout: [
        {
          id: 'testGroupId',
          type: 'group',
          dataModelBindings: {
            group: 'Group',
          },
          children: [
            'field1',
            'field2',
            'field3',
          ],
        },
      ].concat(mockComponents),
      uiConfig: {
        hiddenFields: [],
        repeatingGroups: [],
        autosave: false,
      },
    };

    const initialState = getInitialStateMock({ formLayout: mockLayout });
    mockStore = createStore(initialState);
  });

  it('+++ should match snapshot', () => {
    const rendered = renderer.create(
      <Provider store={mockStore}>
        <Group
          components={mockComponents}
          id='testGroupId'
          index={0}
          key='testKey'
          repeating={true}
          showAdd={true}
        />
      </Provider>,
    );
    expect(rendered).toMatchSnapshot();
  });

  it('+++ should render Add-button when group is repeating', () => {
    const utils = render(
      <Provider store={mockStore}>
        <Group
          components={mockComponents}
          id='testGroupId'
          index={0}
          key='testKey'
          repeating={true}
          showAdd={true}
        />
      </Provider>,
    );
    expect(utils.findByText('Legg til')).toBeTruthy();
  });

  it('+++ should render Delete-button when specified and group is repeating.', () => {
    const utils = render(
      <Provider store={mockStore}>
        <Group
          components={mockComponents}
          id='testGroupId'
          index={0}
          key='testKey'
          repeating={true}
          showDelete={true}
        />
      </Provider>,
    );
    expect(utils.findByText('Slett')).toBeTruthy();
  });
});
