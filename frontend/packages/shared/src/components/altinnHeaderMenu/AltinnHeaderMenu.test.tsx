import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { render as rtlRender, screen } from '@testing-library/react';
import { menu, TopBarMenu } from '../../../../../app-development/layout/AppBar/appBarConfig';
import {
  ServicesContextProvider,
  ServicesContextProps,
} from '../../../../../app-development/common/ServiceContext';
import { AltinnHeaderMenu, IAltinnHeaderMenuProps } from './AltinnHeaderMenu';

describe('AltinnHeaderMenu', () => {
  describe('Should render menu items', () => {
    menu.forEach((entry) => {
      it(`should render ${entry.key} as current item when activeSubHeaderSelection is set to ${entry.key}`, () => {
        render({
          activeSubHeaderSelection: entry.key,
        });
        expect(screen.getByTestId(entry.key)).toBeInTheDocument();
      });
    });
  });
});

const render = (props: Partial<IAltinnHeaderMenuProps> = {}) => {
  const allProps = {
    org: 'jest-test-org',
    app: 'jest-test-app',
    activeSubHeaderSelection: TopBarMenu.Create,
    ...props,
  } as IAltinnHeaderMenuProps;

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
          <AltinnHeaderMenu {...allProps} />
        </ServicesContextProvider>
      </Provider>
    </MemoryRouter>
  );
};
