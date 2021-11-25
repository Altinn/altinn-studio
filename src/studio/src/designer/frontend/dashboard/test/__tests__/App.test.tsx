import 'jest';
import * as React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { act } from 'react-dom/test-utils';
import { mount } from 'enzyme';
import AppBarComponent from '../../../shared/navigation/main-header/appBar';

import { App } from '../../App';

describe('Dashboard > App', () => {
  let store: any;
  const dispatchMock = () => Promise.resolve({});
  const initialState = {
    dashboard: {
      user: {
        full_name: 'John Smith',
        login: 'johnsmith',
      },
    },
  };

  const mountComponent = () => mount(
    <Provider store={store}>
      <App />
    </Provider>,
    { context: { store } },
  );

  beforeEach(() => {
    store = configureStore()(initialState);
    store.dispatch = jest.fn(dispatchMock);
  });

  it('should call dispatch on mount to setup initial data', () => {
    act(() => {
      mountComponent();
    });

    expect(store.dispatch).toHaveBeenCalledTimes(4);
    expect(store.dispatch).toHaveBeenNthCalledWith(1, {
      payload: { url: 'http://localhost/designerapi/User/Current' },
      type: 'dashboard/fetchCurrentUser',
    });
    expect(store.dispatch).toHaveBeenNthCalledWith(2, {
      payload: {
        languageCode: 'nb',
        url: 'http://localhost/designerapi/Language/GetLanguageAsJSON',
      },
      type: 'language/fetchLanguage',
    });
    expect(store.dispatch).toHaveBeenNthCalledWith(3, {
      payload: { url: 'http://localhost/designer/api/v1/user/repos' },
      type: 'dashboard/fetchServices',
    });
    expect(store.dispatch).toHaveBeenNthCalledWith(4, {
      payload: { url: 'http://localhost/designer/api/v1/orgs' },
      type: 'dashboard/fetchOrganisations',
    });
  });

  it('should set AppBarComponent org to user.full_name if set', () => {
    let component: any;
    act(() => {
      component = mountComponent();
    });

    const appBarProps = component.find(AppBarComponent).props();

    expect(appBarProps.org).toBe('John Smith');
  });

  it('should set AppBarComponent org to user.login when user.full_name is not set', () => {
    const storeState = {
      dashboard: {
        user: {
          login: 'johnsmith',
        },
      },
    };

    store = configureStore()(storeState);
    let component: any;
    act(() => {
      component = mountComponent();
    });

    const appBarProps = component.find(AppBarComponent).props();

    expect(appBarProps.org).toBe('johnsmith');
  });
});
