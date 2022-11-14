import React from 'react';
import { createTheme, ThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { render as rtlRender, screen } from '@testing-library/react';
import type { IAppBarProps } from './AppBar';
import { AppBar } from './AppBar';
import altinnTheme from 'app-shared/theme/altinnStudioTheme';
import { menu } from './appBarConfig';

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
  const themeCopy = { ...altinnTheme };
  themeCopy.props.MuiWithWidth = { initialWidth: 'md' };
  const theme = createTheme(themeCopy);
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
        <ThemeProvider theme={theme}>
          <AppBar {...allProps} />
        </ThemeProvider>
      </Provider>
    </MemoryRouter>,
  );
};
