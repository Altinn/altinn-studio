import * as React from 'react';
import { Provider } from 'react-redux';
import * as renderer from 'react-test-renderer';
import configureStore from 'redux-mock-store';
import {
  getInitialStateMock,
  getFormLayoutStateMock,
} from '../../../../__mocks__/mocks';
import type { ILayoutState } from '../layout/formLayoutSlice';
import type { ILayoutGroup } from '../layout';

import { Form } from './Form';
import { mockMediaQuery } from '../../../../testUtils';

const { setScreenWidth } = mockMediaQuery(992);

describe('>>> features/form/components/Form.tsx', () => {
  let mockStore: any;
  let mockLayout: ILayoutState;
  let mockComponents: any;
  let mockGroupId: string;

  beforeAll(() => {
    // Set screen size to desktop
    setScreenWidth(1200);
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
        required: true,
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
            children: ['field1', 'field2', 'field3'],
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
