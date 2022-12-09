import * as React from 'react';
import { Provider } from 'react-redux';

import { getFormDataStateMock, getFormLayoutStateMock, getInitialStateMock } from '__mocks__/mocks';
import { render } from '@testing-library/react';
import configureStore from 'redux-mock-store';

import SummaryGroupComponent from 'src/components/summary/SummaryGroupComponent';
import type { ISummaryGroupComponent } from 'src/components/summary/SummaryGroupComponent';

describe('SummaryGroupComponent', () => {
  let mockHandleDataChange: () => void;
  let mockStore;

  beforeAll(() => {
    const createStore = configureStore();
    const formLayout = getFormLayoutStateMock({
      layouts: {
        page1: [
          {
            type: 'Group',
            id: 'groupComponent',
            dataModelBindings: {
              group: 'mockGroup',
            },
            textResourceBindings: {
              title: 'mockGroupTitle',
            },
            children: ['0:mockId1', '1:mockId2'],
            edit: {
              multiPage: true,
            },
          },
          {
            type: 'Input',
            id: 'mockId1',
            dataModelBindings: {
              simpleBinding: 'mockGroup.mockDataBinding1',
            },
            readOnly: false,
            required: false,
            disabled: false,
            textResourceBindings: {
              title: 'mockField1',
            },
            triggers: [],
          },
          {
            type: 'Input',
            id: 'mockId2',
            dataModelBindings: {
              simpleBinding: 'mockGroup.mockDataBinding2',
            },
            readOnly: false,
            required: false,
            disabled: false,
            textResourceBindings: {
              title: 'mockField2',
            },
            triggers: [],
          },
        ],
      },
      uiConfig: {
        autoSave: true,
        focus: null,
        hiddenFields: [],
        repeatingGroups: {
          groupComponent: {
            index: 0,
            dataModelBinding: 'mockGroup',
          },
        },
        currentView: 'FormLayout',
        navigationConfig: {},
        tracks: {
          order: [],
          hidden: [],
          hiddenExpr: {},
        },
      },
    });

    const formData = getFormDataStateMock({
      formData: {
        'mockGroup[0].mockDataBinding1': '1',
        'mockGroup[0].mockDataBinding2': '2',
      },
    });

    const initialState: any = getInitialStateMock({
      formData,
      formLayout,
      textResources: {
        error: null,
        language: 'nb',
        resources: [
          {
            id: 'mockGroupTitle',
            value: 'Mock group',
          },
          {
            id: 'mockField1',
            value: 'Mock field 1',
          },
          {
            id: 'mockField2',
            value: 'Mock field 2',
          },
        ],
      },
    });
    mockStore = createStore(initialState);
  });

  beforeEach(() => {
    mockHandleDataChange = jest.fn();
  });

  test('SummaryGroupComponent -- should match snapshot', () => {
    const { asFragment } = renderSummaryGroupComponent();
    expect(asFragment()).toMatchSnapshot();
  });

  function renderSummaryGroupComponent(props: Partial<ISummaryGroupComponent> = {}) {
    const defaultProps: ISummaryGroupComponent = {
      pageRef: 'page1',
      componentRef: 'groupComponent',
      largeGroup: false,
      changeText: 'Change',
      onChangeClick: mockHandleDataChange,
    };

    return render(
      <Provider store={mockStore}>
        <SummaryGroupComponent
          {...defaultProps}
          {...props}
        />
      </Provider>,
    );
  }
});
