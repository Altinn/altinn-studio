import { createTheme, MuiThemeProvider } from '@material-ui/core/styles';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import configureStore from 'redux-mock-store';
import { render as rtlRender, screen } from '@testing-library/react';
import { AppBar } from './AppBar';
import type { IAppBarProps } from './AppBar';
import altinnTheme from 'app-shared/theme/altinnStudioTheme';

import { menu } from './appBarConfig';
import { Provider } from 'react-redux';

describe('AppBar', () => {
  describe('When using AppBarConfig menu entries', () => {
    menu.forEach((entry) => {
      it(`should render ${entry.key} as current item when activeSubHeaderSelection is set to ${entry.key}`, () => {
        const { container } = render({
          activeSubHeaderSelection: entry.key,
          showSubMenu: true,
        });

        const activeClassNamePartial = 'subHeaderLinkActive';

        expect(
          container.querySelectorAll(`[class*="${activeClassNamePartial}"]`),
        ).toHaveLength(1);

        const link = screen.getByRole('link', { name: entry.key });
        const hasActiveLinkClass = Array.from(link.classList).some((x) =>
          x.includes(activeClassNamePartial),
        );

        expect(hasActiveLinkClass).toBe(true);
      });
    });
  });
});

const render = (props: Partial<IAppBarProps> = {}) => {
  const theme = createTheme({
    ...altinnTheme,
    props: {
      ...altinnTheme.props,
      MuiWithWidth: {
        initialWidth: 'md', // set initialWidth to md to test with desktop viewport
      },
    },
  });

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
        language: {}
      }
    };
  const store = createStore(initialState);

  return rtlRender(
    <MemoryRouter>
      <Provider store={store}>
      <MuiThemeProvider theme={theme}>
        <AppBar {...allProps} />
      </MuiThemeProvider>
      </Provider>
    </MemoryRouter>,
  );
};
