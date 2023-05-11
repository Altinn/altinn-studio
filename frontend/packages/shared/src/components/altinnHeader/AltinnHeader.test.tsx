import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { render as rtlRender, screen } from '@testing-library/react';
import { AltinnHeader, AltinnHeaderProps } from './AltinnHeader';
import {
  ServicesContextProps,
  ServicesContextProvider,
} from 'app-development/common/ServiceContext';

describe('AltinnHeader', () => {
  it('should render AltinnHeaderMenu', () => {
    render();
    expect(screen.getByTestId('altinn-header-menu')).toBeInTheDocument();
  });

  it('should render AltinnHeaderButtons', () => {
    render();
    expect(screen.getByTestId('altinn-header-buttons')).toBeInTheDocument();
  });

  it('should render AltinnSubMenu when showSubMenu is true', () => {
    render();
    expect(screen.getByTestId('altinn-sub-menu')).toBeInTheDocument();
  });

  it('should not render AltinnSubMenu when showSubMenu is false', () => {
    render({ showSubMenu: false });
    expect(screen.queryByTestId('altinn-sub-menu')).not.toBeInTheDocument();
  });
});

const render = (props: Partial<AltinnHeaderProps> = {}) => {
  const allProps = {
    showSubMenu: true,
    ...props,
  } as AltinnHeaderProps;

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
          <AltinnHeader {...allProps} />
        </ServicesContextProvider>
      </Provider>
    </MemoryRouter>
  );
};
