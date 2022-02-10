import { mount } from 'enzyme';
import * as React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';

import {
  getInitialStateMock,
  getFormDataStateMock,
  getFormLayoutStateMock,
} from '../../__mocks__/mocks';

import { isComponentValid } from '../utils/formComponentUtils';
import { GenericComponent } from './GenericComponent';

describe('GenericComponent', () => {
  let mockStore;
  let mockValidValidations;
  let mockInvalidValidations;

  beforeAll(() => {
    const createStore = configureStore();
    const formLayout = getFormLayoutStateMock({
      layouts: {
        FormLayout: [
          {
            type: 'Input',
            id: 'mockId',
            dataModelBindings: {
              simpleBiding: 'mockDataBinding',
            },
            readOnly: false,
            required: false,
            disabled: false,
            textResourceBindings: {},
            triggers: [],
            grid: {
              xs: 12,
              sm: 10,
              md: 8,
              lg: 6,
              xl: 4,
              innerGrid: {
                xs: 11,
                sm: 9,
                md: 7,
                lg: 5,
                xl: 3,
              },
            },
          },
        ],
      },
    });

    const formData = getFormDataStateMock({
      formData: {
        mockDataBinding: 'value',
      },
    });

    const initialState: any = getInitialStateMock({ formData, formLayout });
    mockStore = createStore(initialState);
    mockValidValidations = {
      simpleBiding: {
        errors: [],
        warnings: [],
      },
    };
    mockInvalidValidations = {
      simpleBinding: {
        errors: ['has error'],
        warnings: ['has warnings'],
      },
    };
  });

  it('should render correct component', () => {
    const wrapper = mount(
      <Provider store={mockStore}>
        <GenericComponent
          id='mockId'
          type='Input'
          textResourceBindings={{}}
          dataModelBindings={{}}
          readOnly={false}
          required={false}
          triggers={[]}
        />
      </Provider>,
    );
    expect(wrapper.exists('#mockId')).toBe(true);
  });

  it('isComponentValid should return correct result', () => {
    const valid = isComponentValid(mockValidValidations);
    const invalid = isComponentValid(mockInvalidValidations);
    expect(valid).toBe(true);
    expect(invalid).toBe(false);
  });

  it('should not crash on Unknown component', () => {
    const wrapper = mount(
      <Provider store={mockStore}>
        <GenericComponent
          id='mockId'
          type='UnknownComponent-DOES_NOT_EXIST'
          textResourceBindings={{}}
          dataModelBindings={{}}
          readOnly={false}
          required={false}
          triggers={[]}
        />
      </Provider>,
    );
    expect(wrapper.text()).toMatch('Unknown component type');
  });
});
