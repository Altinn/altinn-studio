import { createTheme, MuiThemeProvider } from '@material-ui/core/styles';
import { mount } from 'enzyme';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import * as renderer from 'react-test-renderer';
import AppBarComponent from './appBar';
import altinnTheme from '../../theme/altinnStudioTheme';

import * as AppBarConfig from './appBarConfig';

describe('AppBarComponent', () => {
  describe('Snapshot', () => {
    it('should match snapshot', () => {
      const rendered = renderer.create(
        <MemoryRouter>
          <AppBarComponent
            org='jest-test-org'
            app='jest-test-app'
            showSubMenu={true}
            activeSubHeaderSelection='Lage'
          />
        </MemoryRouter>,
      );
      expect(rendered).toMatchSnapshot();
    });

    it('should match snapshot with subHeader and Publisere selection active', () => {
      const rendered = renderer.create(
        <MemoryRouter>
          <AppBarComponent
            org='other-org'
            app='other-app'
            showSubMenu={true}
            activeSubHeaderSelection='Publisere'
          />
        </MemoryRouter>,
      );
      expect(rendered).toMatchSnapshot();
    });

    it('should match snapshot with subHeader and Publisere selection active', () => {
      const wrapper = renderer.create(
        <MemoryRouter>
          <AppBarComponent
            org='other-org'
            app='other-app'
            showSubMenu={true}
            activeSubHeaderSelection='Publisere'
          />
        </MemoryRouter>,
      );
      expect(wrapper).toMatchSnapshot();
    });

    it('should match snapshot and not render subHeader menu', () => {
      const rendered = renderer.create(
        <MemoryRouter>
          <AppBarComponent
            org='jest-test-org'
            app='jest-test-app'
            showSubMenu={false}
          />
        </MemoryRouter>,
      );
      expect(rendered).toMatchSnapshot();
    });

    it('should match snapshot with no app or org', () => {
      const rendered = renderer.create(
        <MemoryRouter>
          <AppBarComponent showSubMenu={false} />
        </MemoryRouter>,
      );
      expect(rendered).toMatchSnapshot();
    });
  });

  describe('When using AppBarConfig', () => {
    const theme = createTheme(altinnTheme);

    AppBarConfig.menu.forEach((entry) => {
      it(`should render ${entry.key}`, () => {
        const app = mount(
          <MemoryRouter>
            <MuiThemeProvider theme={theme}>
              <AppBarComponent
                org='mock-org'
                app='mock-app'
                showBreadcrumbOnTablet={true}
                showSubMenu={true}
                activeSubHeaderSelection={entry.activeSubHeaderSelection}
              />
            </MuiThemeProvider>
          </MemoryRouter>,
          { attachTo: document.getElementById('root') },
        );
        expect(
          app.find('AppBarComponent').prop('activeSubHeaderSelection'),
        ).toEqual(entry.activeSubHeaderSelection);
      });
    });
  });
});
