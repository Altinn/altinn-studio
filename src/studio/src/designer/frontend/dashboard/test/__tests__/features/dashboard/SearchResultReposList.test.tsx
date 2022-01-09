import { mount } from 'enzyme';
import * as React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { SearchResultReposList } from '../../../../features/dashboard/SearchResultReposList';
import { repoApi } from '../../../../services/repoApi';
import { userApi } from '../../../../services/userApi';
import { getDefaultMiddleware } from '@reduxjs/toolkit';

jest.spyOn(repoApi, 'useGetSearchQuery').
  mockImplementation(jest.fn().mockReturnValue({ data: [], isLoading: false}));
jest.spyOn(userApi, 'useGetUserStarredReposQuery').
  mockImplementation(jest.fn().mockReturnValue({ data: [], isLoading: false}));


describe('Dashboard > Common > Components > SearchResultReposList', () => {
  it('should render', () => {
    const initialState = {
      language: {
        language: {},
      },
      dashboard: {
        selectedContext: 'self',
        user: {
          id: 'test'
        },
      },
      designerApi: {},
    };
    const store = configureStore(getDefaultMiddleware())(initialState);
    const component = mount(
      <Provider store={store}>
        <SearchResultReposList searchValue='test' />
      </Provider>
    );

    expect(component.isEmptyRender()).toBe(false);
  });
});
