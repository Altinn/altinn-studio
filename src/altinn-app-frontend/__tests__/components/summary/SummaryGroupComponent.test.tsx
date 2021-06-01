import '@testing-library/jest-dom/extend-expect';
import 'jest';
import * as React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { render } from '@testing-library/react';
import SummaryGroupComponent, { ISummaryGroupComponent } from '../../../src/components/summary/SummaryGroupComponent';
import { getInitialStateMock, getFormDataStateMock, getFormLayoutStateMock } from '../../../__mocks__/mocks';

describe('components/summary/MultipleChoiceSummary.tsx', () => {
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
            children: [
              '0:mockId1',
              '1:mockId2',
            ],
            edit: {
              multiPage: true,
            },
          },
          {
            type: 'Input',
            id: 'mockId1',
            dataModelBindings: {
              simpleBiding: 'mockGroup.mockDataBinding1',
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
              simpleBiding: 'mockGroup.mockDataBinding2',
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
            count: 0,
            dataModelBinding: 'mockGroup',
          },
        },
        currentView: 'FormLayout',
        navigationConfig: {},
        layoutOrder: [],
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

  test('components/summary/MultipleChoiceSummary.tsx -- should match snapshot', () => {
    const { asFragment } = renderMultipleChoiceSummaryComponent();
    expect(asFragment()).toMatchSnapshot();
  });

  function renderMultipleChoiceSummaryComponent(props: Partial<ISummaryGroupComponent> = {}) {
    const defaultProps: ISummaryGroupComponent = {
      id: 'groupComponent-summary',
      pageRef: 'page1',
      componentRef: 'groupComponent',
      largeGroup: false,
      changeText: 'Change',
      onChangeClick: mockHandleDataChange,
    };

    return render(
      <Provider store={mockStore}>
        <SummaryGroupComponent {...defaultProps} {...props}/>
      </Provider>,
    );
  }
});
