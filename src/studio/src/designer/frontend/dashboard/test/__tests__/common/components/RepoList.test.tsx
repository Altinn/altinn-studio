import 'jest';
import * as React from 'react';
import { mount } from 'enzyme';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { DataGrid } from '@mui/x-data-grid';

// import { IRepository } from 'app-shared/types';
import { RepoList } from 'common/components/RepoList';

describe('Dashboard > Common > Components > RepoList', () => {
  it('should render client side sort', () => {
    const component = mountComponent();

    expect(component.isEmptyRender()).toBe(false);
    expect(component.find(DataGrid).prop('sortingMode')).toBe(undefined);
  });

  it('should render server side sort', () => {
    const component = mountComponent({ isServerSort: true });

    expect(component.isEmptyRender()).toBe(false);
    expect(component.find(DataGrid).prop('sortingMode')).toBe('server');
  });

  it('should render with repos', () => {
    const repos = [
      {
        name: 'repo name',
        full_name: 'full_name',
        owner: {
          avatar_url: 'avatar_url',
          login: 'login',
          full_name: 'full_name',
        },
        description: 'description',
        is_cloned_to_local: false,
        updated_at: '2021-11-16T07:05:02Z',
        html_url: 'html_url',
        clone_url: 'clone_url',
        id: 1,
        user_has_starred: false,
      },
    ];
    const component = mountComponent({ repos });

    expect(component.isEmptyRender()).toBe(false);
  });
});

const mountComponent = (props = {}) => {
  const initialState = {
    language: {
      language: {},
    },
    designerApi: {},
  };
  const store = configureStore()(initialState);

  const allProps = {
    isLoading: false,
    ...props,
  };

  return mount(
    <Provider store={store}>
      <RepoList {...allProps} />
    </Provider>,
    { context: { store } },
  );
};
