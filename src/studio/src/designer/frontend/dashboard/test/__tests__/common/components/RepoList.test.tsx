import 'jest';
import * as React from 'react';
import { mount } from 'enzyme';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { DataGrid } from '@mui/x-data-grid';
import { RepoList } from 'common/components/RepoList';
import * as userApi from 'services/userApi';
import { IRepository } from 'app-shared/types';

const useSetStarredRepoMutationSpy = jest.fn();
const useUnsetStarredRepoMutationSpy = jest.fn();

jest.spyOn(userApi, 'useSetStarredRepoMutation').
  mockImplementation(jest.fn().mockReturnValue([useSetStarredRepoMutationSpy]));

jest.spyOn(userApi, 'useUnsetStarredRepoMutation').
  mockImplementation(jest.fn().mockReturnValue([useUnsetStarredRepoMutationSpy]));

describe('Dashboard > Common > Components > RepoList', () => {
  let repos : IRepository[];
  beforeEach(() => {
    repos = [
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
      {
        name: 'other repo',
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
        id: 2,
        user_has_starred: true,
      },
    ];
  });

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
    const component = mountComponent({ repos });

    expect(component.isEmptyRender()).toBe(false);
  });

  it('should call useSetStarredRepoMutation when adding a favorites', () => {
    const component = mountComponent({ repos });

    component.find('#fav-repo-1').hostNodes().simulate('click');
    expect(useSetStarredRepoMutationSpy).toBeCalledWith(repos[0]);
  });

  it('should call useUnsetStarredRepoMutation when removing repo from favorites', () => {
    const component = mountComponent({ repos });
    component.find('#fav-repo-2').hostNodes().simulate('click');
    expect(useUnsetStarredRepoMutationSpy).toBeCalledWith(repos[1]);
  });

  it('should show gitea icon and hide edit app displaying a "-datamodels" repo', () => {
    const datamodelsRepo = {
        name: 'test-datamodels',
        full_name: 'test-datamodels',
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
        id: 2,
        user_has_starred: true,
    }
    const component = mountComponent({ repos: [datamodelsRepo] });

    expect(component.find('.fa-edit')).toHaveLength(0);
    expect(component.find('.fa-gitea')).toHaveLength(1);
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
    disableVirtualization: true, // https://github.com/mui-org/material-ui-x/issues/1151
    ...props,
  };

  return mount(
    <Provider store={store}>
      <RepoList {...allProps} />
    </Provider>
  );
};
