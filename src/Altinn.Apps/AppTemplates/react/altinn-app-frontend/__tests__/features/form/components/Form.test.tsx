
import 'jest';
import * as React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import * as renderer from 'react-test-renderer';
import configureStore from 'redux-mock-store';
import { Form } from '../../../../src/features/form/containers/Form';
import { getInitialStateMock, getFormLayoutStateMock } from '../../../../__mocks__/mocks';

describe('>>> features/form/components/Form.tsx', () => {
  let mockStore: any;
  let mockLayout: any;
  let mockComponents: any;
  let mockGroupId: string;

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
    mockGroupId = 'testGroupId';
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

    mockLayout = getFormLayoutStateMock({
      layout: [
        {
          id: mockGroupId,
          type: 'group',
          dataModelBindings: {
            group: 'Group',
          },
          maxCount: 3,
          children: [
            'field1',
            'field2',
            'field3',
          ],
        },
      ].concat(mockComponents),
    });

    const initialState = getInitialStateMock({ formLayout: mockLayout });
    mockStore = createStore(initialState);
  });

  it('+++ should match snapshot', () => {
    const rendered = renderer.create(
      <Provider store={mockStore}>
        <Form />
      </Provider>,
    );
    expect(rendered).toMatchSnapshot();
  });

  it('+++ should render new repeating group when Add button is clicked', async () => {
    const utils = render(
      <Provider store={mockStore}>
        <Form/>
      </Provider>,
    );

    waitFor(() => {
      expect(utils.getByTestId(`group-${mockGroupId}-0`)).toBeTruthy();
      expect(utils.getByTestId(`group-${mockGroupId}-1`)).toBeFalsy();
    });

    const addButton = await utils.findByText('Legg til');
    fireEvent.click(addButton);

    waitFor(() => {
      expect(utils.getByTestId(`group-${mockGroupId}-0`)).toBeTruthy();
      expect(utils.getByTestId(`group-${mockGroupId}-1`)).toBeTruthy();
    });
  });

  it('+++ should hide Add-button when maxCount for repeating groups is reached.', async () => {
    const utils = render(
      <Provider store={mockStore}>
        <Form/>
      </Provider>,
    );

    waitFor(() => {
      expect(utils.getByTestId(`group-${mockGroupId}-0`)).toBeTruthy();
      expect(utils.getByTestId(`group-${mockGroupId}-1`)).toBeFalsy();
    });

    const addButton = await utils.findByRole('button');
    fireEvent.click(addButton);

    waitFor(() => {
      expect(utils.getByTestId(`group-${mockGroupId}-1`)).toBeTruthy();
    });

    fireEvent.click(addButton);

    waitFor(() => {
      expect(utils.getByTestId(`group-${mockGroupId}-2`)).toBeTruthy();
      expect(addButton).toBeTruthy();
    });
  });
});
