import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { render as rtlRender, screen } from '@testing-library/react';
import type { IAppBarProps } from './AppBar';
import { AppBar } from './AppBar';
import { menu } from './appBarConfig';

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
  const allProps = {
    org: 'jest-test-org',
    app: 'jest-test-app',
    showSubMenu: true,
    activeSubHeaderSelection: 'Lage',
    ...props,
  } as IAppBarProps;

  const createStore = configureStore();
  const initialState = {
    languageState: {
      language: {},
    },
  };
  const store = createStore(initialState);

  return rtlRender(
    <MemoryRouter>
      <Provider store={store}>
        <AppBar {...allProps} />
      </Provider>
    </MemoryRouter>
  );
};
