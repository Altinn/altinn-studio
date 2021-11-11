
import 'jest';
import * as React from 'react';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import * as renderer from 'react-test-renderer';
import configureStore from 'redux-mock-store';
import { Form } from '../../../../src/features/form/containers/Form';
import { getInitialStateMock, getFormLayoutStateMock } from '../../../../__mocks__/mocks';
import { ILayoutState } from '../../../../src/features/form/layout/formLayoutSlice';
import { ILayoutGroup } from '../../../../src/features/form/layout';

describe('>>> features/form/components/Form.tsx', () => {
  let mockStore: any;
  let mockLayout: ILayoutState;
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
      layouts: {
        FormLayout: [
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
          } as ILayoutGroup,
        ].concat(mockComponents),
      },
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
});
