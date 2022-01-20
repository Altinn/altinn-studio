
import 'jest';
import * as React from 'react';
import configureStore from 'redux-mock-store';
import { mount } from 'enzyme';
import { Provider } from 'react-redux';
import { ButtonComponent } from '../../../src/components/base/ButtonComponent';
import { IComponentProps } from 'src/components';

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
  let mockLanguage;

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
      },
      formLayout: {
        uiConfig: {
          autoSave: true,
        },
      },
    };
    initialStateSubmitting = {
      formData: {
        isSubmitting: true,
      },
      formLayout: {
        uiConfig: {
          autoSave: true,
        },
      },
    };

    mockStore = createStore(initialState);
    mockStoreSubmitting = createStore(initialStateSubmitting);
    mockLanguage = {};
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
          language={mockLanguage}
          {...({} as IComponentProps)}
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
          language={mockLanguage}
          {...({} as IComponentProps)}
        />
      </Provider>
    );
    expect(wrapper.find('#altinn-loader')).toHaveLength(1);

  });
});
