import { createMuiTheme, MuiThemeProvider } from '@material-ui/core/styles';
import { mount } from 'enzyme';
import * as React from 'react';
import { MemoryRouter } from 'react-router-dom';
import * as renderer from 'react-test-renderer';
import AppBarComponent from '../src/navigation/main-header/appBar';
import altinnTheme from '../src/theme/altinnStudioTheme';

describe('AppBarComponent - src/navigation/main-header/appBar - snapshot...', () => {
  let mockOrg: string;
  let mockService: string;
  let mockActiveSubHeaderSelection: string;
  let mockShowSubheader: boolean;

  beforeEach(() => {
    mockOrg = 'jest-test-org';
    mockService = 'jest-test-service';
    mockActiveSubHeaderSelection = 'create';
    mockShowSubheader = true;

  });

  it('should match snapshot with default values', () => {
    const rendered = renderer.create(
      <MemoryRouter>
        <AppBarComponent
          org={mockOrg}
          service={mockService}
          showSubHeader={mockShowSubheader}
          activeSubHeaderSelection={mockActiveSubHeaderSelection}
        />
      </MemoryRouter>,
    );
    expect(rendered).toMatchSnapshot();
  });

  it('should match snapshot with subHeader and Publish selection active', () => {
    mockOrg = 'other-org';
    mockService = 'other-service';
    mockActiveSubHeaderSelection = 'publish';
    const rendered = renderer.create(
      <MemoryRouter>
        <AppBarComponent
          org={mockOrg}
          service={mockService}
          showSubHeader={mockShowSubheader}
          activeSubHeaderSelection={mockActiveSubHeaderSelection}
        />
      </MemoryRouter>,
    );
    expect(rendered).toMatchSnapshot();
  });

  it('should match snapshot and not render subHeader menu', () => {
    const rendered = renderer.create(
      <MemoryRouter>
        <AppBarComponent
          org={mockOrg}
          service={mockService}
          showSubHeader={false}
        />
      </MemoryRouter>,
    );
    expect(rendered).toMatchSnapshot();
  });

  it('should match snapshot with no service or org', () => {
    const rendered = renderer.create(
      <MemoryRouter>
        <AppBarComponent
          showSubHeader={false}
        />
      </MemoryRouter>,
    );
    expect(rendered).toMatchSnapshot();
  });
});

describe('AppBarComponent - Responsive renders...', () => {
  let app: any;
  const desktopWidth: number = 1025;
  const desktopHeight: number = 800;
  const tabletWidth: number = 1024;
  const tabletHeight: number = 768;

  const theme = createMuiTheme(altinnTheme);

  beforeEach(() => {
    window.resizeTo(desktopWidth, desktopHeight);
  });

  it(`desktop header (${desktopWidth}x${desktopHeight})`, () => {
    const mockOrg = 'myDesktopOrg';
    const mockService = 'myDesktopService';
    const mockActiveSubHeaderSelection = 'subHeaderSelection';
    const mockActiveLeftMenuSelection = 'leftmenuselection';

    app = mount(
      <MuiThemeProvider theme={theme}>
        <AppBarComponent
          org={mockOrg}
          service={mockService}
          showSubHeader={false}
          activeSubHeaderSelection={mockActiveSubHeaderSelection}
          activeLeftMenuSelection={mockActiveLeftMenuSelection}
        />
      </MuiThemeProvider>, { attachTo: document.getElementById('root') }
    );
    expect(app.text()).not.toMatch(`/ ${mockActiveSubHeaderSelection} / ${mockActiveLeftMenuSelection}`);
    expect(app.text()).toMatch(`${mockService}${mockOrg}`);
    app.unmount();
  });

  it(`tablet header (${tabletWidth}x${tabletHeight})`, () => {
    const mockOrg = 'myTabletOrg';
    const mockService = 'myTabletService';
    const mockActiveSubHeaderSelection = 'subHeaderSelection';
    const mockActiveLeftMenuSelection = 'leftmenuselection';

    window.resizeTo(tabletWidth, tabletHeight);
    app = mount(
      <MuiThemeProvider theme={theme}>
        <AppBarComponent
          org={mockOrg}
          service={mockService}
          showSubHeader={false}
          activeSubHeaderSelection={mockActiveSubHeaderSelection}
          activeLeftMenuSelection={mockActiveLeftMenuSelection}
        />
      </MuiThemeProvider>, { attachTo: document.getElementById('root') },
    );
    expect(app.text()).toMatch(`/ ${mockActiveSubHeaderSelection} / ${mockActiveLeftMenuSelection}`);
    expect(app.text()).not.toMatch(`${mockService}${mockOrg}`);
    app.unmount();
  });

});
