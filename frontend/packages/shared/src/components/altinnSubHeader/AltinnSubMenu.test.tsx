import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { render as rtlRender, screen } from '@testing-library/react';
import {
  ServicesContextProps,
  ServicesContextProvider,
} from 'app-development/common/ServiceContext';
import { AltinnSubMenu } from './AltinnSubMenu';

describe('AltinnSubMenu', () => {
  it('should render component', () => {
    render();
    expect(screen.getByTestId('altinn-sub-menu')).toBeInTheDocument();
  });

  it('should render BranchingIcon', () => {
    render();
    expect(screen.getByTestId('branching-icon')).toBeInTheDocument();
  });

  it('should render VersionControlHeader', () => {
    render();
    expect(screen.getByTestId('version-control-header')).toBeInTheDocument();
  });
});

const render = () => {
  const createStore = configureStore();
  const initialState = {
    serviceInformation: {
      repositoryInfo: {
        repository: {
          owner: {
            full_name: 'Jest Test Org',
          },
        },
      },
    },
  };
  const store = createStore(initialState);
  const queries: Partial<ServicesContextProps> = {
    getRepoMetadata: async () => ({
      permissions: {
        push: true,
      },
    }),
  };
  return rtlRender(
    <MemoryRouter>
      <Provider store={store}>
        <ServicesContextProvider {...queries}>
          <AltinnSubMenu />
        </ServicesContextProvider>
      </Provider>
    </MemoryRouter>
  );
};
