import { createTheme, MuiThemeProvider } from '@material-ui/core/styles';
import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import { MemoryRouter } from 'react-router-dom';
import * as renderer from 'react-test-renderer';
import AppBarComponent from '../../navigation/main-header/appBar';
import altinnTheme from '../../theme/altinnStudioTheme';

import * as AppBarConfig from '../../navigation/main-header/appBarConfig';

describe('AppBarComponent - src/navigation/main-header/appBar', () => {
  describe('Snapshot', () => {
    let mockOrg: string;
    let mockApp: string;
    let mockActiveSubHeaderSelection: string;
    let mockShowSubheader: boolean;

    beforeEach(() => {
      mockOrg = 'jest-test-org';
      mockApp = 'jest-test-app';
      mockActiveSubHeaderSelection = 'Lage';
      mockShowSubheader = true;
    });

    it('should match snapshot', () => {
      const rendered = renderer.create(
        <MemoryRouter>
          <AppBarComponent
            org={mockOrg}
            app={mockApp}
            showSubMenu={mockShowSubheader}
            activeSubHeaderSelection={mockActiveSubHeaderSelection}
          />
        </MemoryRouter>,
      );
      expect(rendered).toMatchSnapshot();
    });

    it('should match snapshot with subHeader and Publisere selection active', () => {
      mockOrg = 'other-org';
      mockApp = 'other-app';
      mockActiveSubHeaderSelection = 'Publisere';
      const rendered = renderer.create(
        <MemoryRouter>
          <AppBarComponent
            org={mockOrg}
            app={mockApp}
            showSubMenu={mockShowSubheader}
            activeSubHeaderSelection={mockActiveSubHeaderSelection}
          />
        </MemoryRouter>,
      );
      expect(rendered).toMatchSnapshot();
    });

    it('should match snapshot with subHeader and Publisere selection active', () => {
      mockOrg = 'other-org';
      mockApp = 'other-app';
      mockActiveSubHeaderSelection = 'Publisere';
      const wrapper = renderer.create(
        <MemoryRouter>
          <AppBarComponent
            org={mockOrg}
            app={mockApp}
            showSubMenu={mockShowSubheader}
            activeSubHeaderSelection={mockActiveSubHeaderSelection}
          />
        </MemoryRouter>,
      );
      expect(wrapper).toMatchSnapshot();
    });

    it('should match snapshot and not render subHeader menu', () => {
      const rendered = renderer.create(
        <MemoryRouter>
          <AppBarComponent
            org={mockOrg}
            app={mockApp}
            showSubMenu={false}
          />
        </MemoryRouter>,
      );
      expect(rendered).toMatchSnapshot();
    });

    it('should match snapshot with no app or org', () => {
      const rendered = renderer.create(
        <MemoryRouter>
          <AppBarComponent
            showSubMenu={false}
          />
        </MemoryRouter>,
      );
      expect(rendered).toMatchSnapshot();
    });
  });

  describe('When using AppBarConfig', () => {
    let app: any;
    const mockOrg: string = 'mock-org';
    const mockApp: string = 'mock-app';
    const mockShowSubheader: boolean = true;

    const theme = createTheme(altinnTheme);

    const tabletWidth: number = 1024;
    const tabletHeight: number = 768;

    window.resizeTo(tabletWidth, tabletHeight);

    AppBarConfig.menu.forEach((entry) => {
      it(`should render ${entry.key}`, () => {
        app = mount(
          <MemoryRouter>
            <MuiThemeProvider theme={theme}>
              <AppBarComponent
                org={mockOrg}
                app={mockApp}
                showBreadcrumbOnTablet={true}
                showSubMenu={mockShowSubheader}
                activeSubHeaderSelection={entry.activeSubHeaderSelection}
              />
            </MuiThemeProvider>
          </MemoryRouter>, { attachTo: document.getElementById('root') },
        );
        expect(
          app.find('AppBarComponent').prop('activeSubHeaderSelection'),
        ).toEqual(entry.activeSubHeaderSelection);
      });
    });
  });
});
