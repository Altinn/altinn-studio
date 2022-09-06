import { createTheme, MuiThemeProvider } from '@material-ui/core/styles';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render as rtlRender, screen } from '@testing-library/react';
import { AppBar } from './AppBar';
import type { IAppBarProps } from './AppBar';
import altinnTheme from 'app-shared/theme/altinnStudioTheme';

import { menu } from './appBarConfig';

describe('AppBar', () => {
  describe('Snapshot', () => {
    it('should match snapshot', () => {
      const { container } = render();

      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot with subHeader and Publisere selection active', () => {
      const { container } = render({
        org: 'other-org',
        app: 'other-app',
        showSubMenu: true,
        activeSubHeaderSelection: 'Publisere',
      });

      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot and not render subHeader menu', () => {
      const { container } = render({
        showSubMenu: false,
      });

      expect(container.firstChild).toMatchSnapshot();
    });

    it('should match snapshot with no app or org', () => {
      const { container } = render({
        org: undefined,
        app: undefined,
        showSubMenu: false,
        activeSubHeaderSelection: undefined,
      });

      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe('When using AppBarConfig menu entries', () => {
    menu.forEach((entry) => {
      it(`should render ${entry.key} as current item when activeSubHeaderSelection is set to ${entry.activeSubHeaderSelection}`, () => {
        const { container } = render({
          activeSubHeaderSelection: entry.activeSubHeaderSelection,
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

  return rtlRender(
    <MemoryRouter>
      <MuiThemeProvider theme={theme}>
        <AppBar {...allProps} />
      </MuiThemeProvider>
    </MemoryRouter>,
  );
};
