import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { render as rtlRender, screen } from '@testing-library/react';
import type { IAppBarProps } from './AppBar';
import { AppBar } from './AppBar';
import { menu, TopBarMenu } from './appBarConfig';
import { ServicesContextProps, ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { repositoryMock } from '../../test/repositoryMock';

describe('AppBar', () => {
  describe('When using AppBarConfig menu entries', () => {
    menu.forEach((entry) => {
      it(`should render ${entry.key} as current item when activeSubHeaderSelection is set to ${entry.key}`, () => {
        render({
          activeSubHeaderSelection: entry.key,
          showSubMenu: true,
        });
        expect(screen.getByTestId(entry.key)).toBeInTheDocument();
      });
    });
  });
});

const render = (props: Partial<IAppBarProps> = {}) => {
  const allProps: IAppBarProps = {
    showSubMenu: true,
    activeSubHeaderSelection: TopBarMenu.Create,
    ...props,
  };

  const createStore = configureStore();
  const initialState = {
    serviceInformation: {
      repositoryInfo: {
        repository: {
          owner: {
            full_name: "Jest Test Org"
          }
        }
      }
    }
  };
  const store = createStore(initialState);
  const queries: Partial<ServicesContextProps> = {
    getRepoMetadata: async () => repositoryMock,
  };
  return rtlRender(
    <MemoryRouter>
      <Provider store={store}>
        <ServicesContextProvider {...queries}>
          <AppBar {...allProps} />
        </ServicesContextProvider>
      </Provider>
    </MemoryRouter>
  );
};
