import { mount } from 'enzyme';
import * as React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { OrgReposList } from '../../../../features/dashboard/OrgReposList';
import { repoApi } from '../../../../services/repoApi';
import { organizationApi } from '../../../../services/organizationApi';
import { userApi } from '../../../../services/userApi';
import { getDefaultMiddleware } from '@reduxjs/toolkit';

jest.spyOn(repoApi, 'useGetSearchQuery').
  mockImplementation(jest.fn().mockReturnValue(
    {
      data: [{
        full_name: "test",
        id: 4,
      },
      {
        full_name: "test-datamodels",
        id: 3,
      }],
      isLoading: false
    }));
jest.spyOn(organizationApi, 'useGetOrganizationsQuery').
  mockImplementation(jest.fn().mockReturnValue({ data: [] }));
jest.spyOn(userApi, 'useGetUserStarredReposQuery').
  mockImplementation(jest.fn().mockReturnValue({ data: [], isLoading: false }));


describe('Dashboard > Common > Components > OrgReposList', () => {
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
        <OrgReposList />
      </Provider>
    );

    expect(component.isEmptyRender()).toBe(false);
  });
});
