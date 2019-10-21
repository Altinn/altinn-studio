/* tslint:disable:jsx-wrap-multiline */
import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { GenericComponent, isComponentValid } from '../../src/components/GenericComponent';

describe('>>> components/GenericComponent.tsx', () => {

  let mockStore;
  let mockValidValidations;
  let mockInvalidValidations;

  beforeAll(() => {
    const createStore = configureStore();
    const initialState: any = {
      formLayout: {
        layout: [
          { type: 'Input', id: 'mockId', hidden: false },
        ],
      },
      formDataModel: {},
      language: {
        language: {},
      },
      textResources: {
          resources: [],
      },
      formValidations: {
        validations: {},
      },
      formData: {
        unsavedChanges: false,
        formData: {
          mockId: {
            mockDataBinding: 'value',
          },
        },
      },
    };
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
