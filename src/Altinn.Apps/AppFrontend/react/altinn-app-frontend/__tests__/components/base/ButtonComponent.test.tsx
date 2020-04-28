/* tslint:disable:jsx-wrap-multiline */
import 'jest';
import * as React from 'react';
import configureStore from 'redux-mock-store';
import { mount } from 'enzyme';
import { ButtonComponent } from '../../../src/components/base/ButtonComponent';
import { Provider } from 'react-redux';

describe('components/base/ButtonComponent.tsx', () => {
  let mockId: string;
  let mockText: string;
  let formDataCount: number;
  let mockHandleDataChange: (value: any) => void;
  let mockDisabled: boolean;
  let initialState;
  let initialStateSubmitting;
  let mockStore;
  let mockStoreSubmitting;

  beforeAll(() => {
    const createStore = configureStore();
    mockId = 'mock-id';
    mockHandleDataChange = (data: any) => null;
    mockDisabled = false;
    mockText = 'Submit form';
    formDataCount = 0;
    initialState = {
      formData: {
        isSubmitting: false,
      }
    };
    initialStateSubmitting = {
      formData: {
        isSubmitting: true,
      }
    };

    mockStore = createStore(initialState);
    mockStoreSubmitting = createStore(initialStateSubmitting);
  });

  it('+++ should render button when isSubmitting is false', () => {
    const wrapper = mount(
      <Provider store={mockStore}>
        <ButtonComponent
          id={mockId}
          text={mockText}
          handleDataChange={mockHandleDataChange}
          disabled={mockDisabled}
          formDataCount={formDataCount}
        />
      </Provider>
    );
    const submitBtn = wrapper.find('button#' + mockId);
    expect(submitBtn.text()).toEqual(mockText);
  });

  it('+++ should render loader when isSubmitting is true', () => {
    const wrapper = mount(
      <Provider store={mockStoreSubmitting}>
        <ButtonComponent
          id={mockId}
          text={mockText}
          handleDataChange={mockHandleDataChange}
          disabled={mockDisabled}
          formDataCount={formDataCount}
        />
      </Provider>
    );
    expect(wrapper.find('#' + mockId + '-loader')).toHaveLength(1);

  });
});
