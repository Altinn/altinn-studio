import 'jest';
import * as React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { act } from 'react-dom/test-utils';
import { mount } from 'enzyme';
import { Header } from 'app-shared/navigation/main-header/Header';

import { App } from '../../App';

describe('Dashboard > App', () => {
  let store: any;

  const mountComponent = (extraInitialState = {}) => {
    const dispatchMock = () => Promise.resolve({});
    const initialState = {
      dashboard: {
        user: {
          full_name: 'John Smith',
          login: 'johnsmith',
        },
      },
      designerApi: {},
      language: {
        language: {
          dashboard: {
            loading: 'loading',
            logout: 'logout',
          },
        },
      },
    };

    const mergedState = {
      ...initialState,
      ...extraInitialState,
    };

    store = configureStore()(mergedState);
    store.dispatch = jest.fn(dispatchMock);

    return mount(
      <Provider store={store}>
        <App />
      </Provider>,
      { context: { store } },
    );
  };

  it('should call dispatch on mount to setup initial data', () => {
    act(() => {
      mountComponent();
    });

    expect(store.dispatch).toHaveBeenCalledTimes(4);
    expect(store.dispatch).toHaveBeenNthCalledWith(2, {
      payload: { url: 'http://localhost/designer/api/v1/user/current' },
      type: 'dashboard/fetchCurrentUser',
    });
    expect(store.dispatch).toHaveBeenNthCalledWith(3, {
      payload: {
        languageCode: 'nb',
        url: 'http://localhost/designerapi/Language/GetLanguageAsJSON',
      },
      type: 'language/fetchLanguage',
    });
    expect(store.dispatch).toHaveBeenNthCalledWith(4, {
      payload: { url: 'http://localhost/designer/api/v1/user/repos' },
      type: 'dashboard/fetchServices',
    });
  });

  it('should show waiting while user and orgs are not loaded', () => {
    let component: any;
    act(() => {
      component = mountComponent();
    });

    expect(component.find(Header).exists()).toBe(false);
    expect(component.text()).toEqual('loading');
  });
});
