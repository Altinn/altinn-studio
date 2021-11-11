
import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
// eslint-disable-next-line import/no-named-as-default
import GenericComponent from '../../src/components/GenericComponent';
import { isComponentValid } from '../../src/utils/formComponentUtils';
import { getInitialStateMock, getFormDataStateMock, getFormLayoutStateMock } from '../../__mocks__/mocks';

describe('>>> components/GenericComponent.tsx', () => {
  let mockStore;
  let mockValidValidations;
  let mockInvalidValidations;

  beforeAll(() => {
    const createStore = configureStore();
    const formLayout = getFormLayoutStateMock({
      layout: [
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
        },
      ],
    });

    const formData = getFormDataStateMock({
      formData: {
        mockId: {
          mockDataBinding: 'value',
        },
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

  it('+++ should render correct component', () => {
    const wrapper = mount(
      <Provider store={mockStore}>
        <GenericComponent
          id={'mockId'}
          type={'Input'}
          textResourceBindings={{}}
          dataModelBindings={{}}
          readOnly={false}
          required={false}
        />
      </Provider>);
    expect(wrapper.exists('#mockId')).toBe(true);
  });

  it('+++ isComponentValid should return correct result', () => {
    const valid = isComponentValid(mockValidValidations);
    const invalid = isComponentValid(mockInvalidValidations);
    expect(valid).toBe(true);
    expect(invalid).toBe(false);
  });

});
