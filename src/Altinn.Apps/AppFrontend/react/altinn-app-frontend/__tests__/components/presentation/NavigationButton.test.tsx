/* eslint-disable no-undef */

import 'jest';
import * as React from 'react';
import { Provider } from 'react-redux';
import { render, screen } from '@testing-library/react';
import configureStore from 'redux-mock-store';
import { getFormLayoutStateMock, getInitialStateMock } from '../../../__mocks__/mocks';
import { NavigationButtons } from '../../../src/components/presentation/NavigationButtons';
import { IComponentProps } from 'src/components';

describe('>>> components/presentation/NavigationButton.tsx', () => {
  let mockStore;
  let mockLayout;

  beforeAll(() => {
    mockLayout = getFormLayoutStateMock({
      layouts: {
        layout1: [
          {
            type: 'Input',
            id: 'mockId1',
            dataModelBindings: {
              simpleBiding: 'mockDataBinding1',
            },
            readOnly: false,
            required: false,
            disabled: false,
            textResourceBindings: {},
          },
          {
            id: 'nav-button-1',
            type: 'NavigationButtons',
            textResourceBindings: {},
            dataModelBindings: {},
            readOnly: false,
            required: false,
          },
        ],
        layout2: [
          {
            type: 'Input',
            id: 'mockId2',
            dataModelBindings: {
              simpleBiding: 'mockDataBinding2',
            },
            readOnly: false,
            required: false,
            disabled: false,
            textResourceBindings: {},
          },
          {
            id: 'nav-button-2',
            type: 'NavigationButtons',
            textResourceBindings: {},
            dataModelBindings: {},
            readOnly: false,
            required: false,
          },
        ],
      },
      uiConfig: {
        currentView: 'layout1',
        autoSave: true,
        focus: null,
        hiddenFields: [],
        repeatingGroups: null,
        layoutOrder: ['layout1', 'layout2'],
        navigationConfig: {
          layout1: {
            next: 'layout2',
          },
          layout2: {
            previous: 'layout1',
          },
        },
      },
    });
  });

  beforeEach(() => {
    const createStore = configureStore();
    const mockInitialState = getInitialStateMock({
      formLayout: mockLayout,
    });
    mockStore = createStore(mockInitialState);
  });

  test('renders default NavigationButtons component', () => {
    render(
      <Provider store={mockStore}>
        <NavigationButtons
          id='nav-button-1'
          showBackButton={false}
          textResourceBindings={null}
          {...({} as IComponentProps)}
        />
      </Provider>,
    );

    expect(screen.getByText('next')).toBeTruthy();
    expect(screen.queryByText('back')).toBeFalsy();
  });

  test('renders NavigationButtons component without back button if there is no previous page', () => {
    render(
      <Provider store={mockStore}>
        <NavigationButtons
          id='nav-button-1'
          showBackButton={true}
          textResourceBindings={null}
          {...({} as IComponentProps)}
        />
      </Provider>,
    );

    expect(screen.getByText('next')).toBeTruthy();
    expect(screen.queryByText('back')).toBeNull();
  });

  test('renders NavigationButtons component with back button if there is a previous page', () => {
    const uiConfig = {
      ...mockLayout.uiConfig,
      currentView: 'layout2',
    };
    const layoutState = getFormLayoutStateMock({
      ...mockLayout,
      uiConfig,
    });
    const initialState = getInitialStateMock({
      formLayout: layoutState,
    });

    const createStoreNew = configureStore();
    const store = createStoreNew(initialState);
    render(
      <Provider store={store}>
        <NavigationButtons
          id='nav-button-2'
          showBackButton={true}
          textResourceBindings={null}
          {...({} as IComponentProps)}
        />
      </Provider>,
    );

    expect(screen.queryByText('back')).toBeTruthy();
  });
});
