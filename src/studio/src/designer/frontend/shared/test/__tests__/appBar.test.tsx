// tslint:disable: max-line-length
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

  // TODO: .text() does not work on material ui v4. Tests needs to be rewritten.
  // describe('Responsive design', () => {
  //   let app: any;
  //   const desktopWidth: number = 1025;
  //   const desktopHeight: number = 800;
  //   const tabletWidth: number = 1024;
  //   const tabletHeight: number = 768;

  //   const theme = createTheme(altinnTheme);

  //   beforeEach(() => {
  //     window.resizeTo(desktopWidth, desktopHeight);
  //   });

  //   it(`should render desktop header when (${desktopWidth}x${desktopHeight})`, () => {
  //     const mockOrg = 'myDesktopOrg';
  //     const mockApp = 'myDesktopApp';
  //     const mockActiveSubHeaderSelection = 'subHeaderSelection';
  //     const mockActiveLeftMenuSelection = 'leftmenuselection';

  //     app = mount(
  //       <MemoryRouter>
  //         <MuiThemeProvider theme={theme}>
  //           <AppBarComponent
  //             org={mockOrg}
  //             app={mockApp}
  //             showSubMenu={false}
  //             activeSubHeaderSelection={mockActiveSubHeaderSelection}
  //             activeLeftMenuSelection={mockActiveLeftMenuSelection}
  //           />
  //         </MuiThemeProvider>
  //       </MemoryRouter>, { attachTo: document.getElementById('root') },
  //     );
  //     expect(app.text()).not.toMatch(`/ ${mockActiveSubHeaderSelection} / ${mockActiveLeftMenuSelection}`);
  //     expect(app.text()).toMatch(`${mockApp}${mockOrg}`);
  //     app.unmount();
  //   });

  //   it(`should render tablet header (${tabletWidth}x${tabletHeight})`, () => {
  //     const mockOrg = 'myTabletOrg';
  //     const mockApp = 'myTabletApp';
  //     const mockActiveSubHeaderSelection = 'subHeaderSelection';
  //     const mockActiveLeftMenuSelection = 'leftmenuselection';

  //     window.resizeTo(tabletWidth, tabletHeight);

  //     app = mount(
  //       <MemoryRouter>
  //         <MuiThemeProvider theme={theme}>
  //           <AppBarComponent
  //             org={mockOrg}
  //             app={mockApp}
  //             showBreadcrumbOnTablet={true}
  //             showSubMenu={false}
  //             activeSubHeaderSelection={mockActiveSubHeaderSelection}
  //             activeLeftMenuSelection={mockActiveLeftMenuSelection}
  //           />
  //         </MuiThemeProvider>
  //       </MemoryRouter>, { attachTo: document.getElementById('root') },
  //     );
  //     expect(app.text()).toMatch(`/ ${mockActiveSubHeaderSelection} / ${mockActiveLeftMenuSelection}`);
  //     expect(app.text()).not.toMatch(`${mockApp}${mockOrg}`);
  //     app.unmount();
  //   });

  //   it(`should not render breadcrumb when tablet header (${tabletWidth}x${tabletHeight})
  //         and no prop.activeSubHeaderSelection is undefined`, () => {
  //       const mockOrg = 'myTabletOrg';
  //       const mockApp = 'myTabletApp';
  //       const mockActiveSubHeaderSelection = 'subHeaderSelection';
  //       const mockActiveLeftMenuSelection = 'leftmenuselection';

  //       window.resizeTo(tabletWidth, tabletHeight);

  //       app = mount(
  //         <MemoryRouter>
  //           <MuiThemeProvider theme={theme}>
  //             <AppBarComponent
  //               org={mockOrg}
  //               app={mockApp}
  //               showBreadcrumbOnTablet={false}
  //               showSubMenu={false}
  //               activeSubHeaderSelection={mockActiveSubHeaderSelection}
  //               activeLeftMenuSelection={mockActiveLeftMenuSelection}
  //             />
  //           </MuiThemeProvider>
  //         </MemoryRouter>, { attachTo: document.getElementById('root') },
  //       );

  //       expect(app.text()).not.toMatch(`/`);
  //       expect(app.text()).toMatch(`${mockApp}`);
  //       app.unmount();

  //     });

  //   it(`should render logout menu when logoutButton prop is true`, () => {
  //     const mockOrg = 'myTabletOrg';
  //     const mockApp = 'myTabletApp';
  //     const mockActiveSubHeaderSelection = 'subHeaderSelection';
  //     const mockActiveLeftMenuSelection = 'leftmenuselection';

  //     window.resizeTo(tabletWidth, tabletHeight);

  //     app = mount(
  //       <MemoryRouter>
  //         <MuiThemeProvider theme={theme}>
  //           <AppBarComponent
  //             logoutButton={true}
  //             org={mockOrg}
  //             app={mockApp}
  //             showBreadcrumbOnTablet={false}
  //             showSubMenu={false}
  //             activeSubHeaderSelection={mockActiveSubHeaderSelection}
  //             activeLeftMenuSelection={mockActiveLeftMenuSelection}
  //           />
  //         </MuiThemeProvider>
  //       </MemoryRouter>, { attachTo: document.getElementById('root') },
  //     );

  //     expect(app.text()).toMatch(`logout`);
  //     expect(app.text()).not.toMatch(`meny`);
  //     app.unmount();
  //   });

  // });

  describe('When using AppBarConfig', () => {
    let app: any;
    const mockOrg: string = 'mock-org';
    const mockApp: string = 'mock-app';
    const mockShowSubheader: boolean = true;

    const theme = createTheme(altinnTheme);

    const tabletWidth: number = 1024;
    const tabletHeight: number = 768;

    window.resizeTo(tabletWidth, tabletHeight);

    AppBarConfig.menu.map((entry) => {
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

        expect(app.find('WithStyles(AppBarComponent)').prop('activeSubHeaderSelection')).toEqual(entry.activeSubHeaderSelection);
      });
    });
  });

});
