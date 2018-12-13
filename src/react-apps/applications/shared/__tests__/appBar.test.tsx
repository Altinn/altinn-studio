// import { shallow } from 'enzyme';
import { mount } from 'enzyme';
// import { render } from 'enzyme';

import * as React from 'react';
import * as renderer from 'react-test-renderer';

import { MemoryRouter } from 'react-router';

import AppBarComponent from '../src/navigation/main-header/appBar';

describe('AppBarComponent - src/navigation/main-header/appBar - snapshot...', () => {
  let mockOrg: string;
  let mockService: string;
  let mockActiveSubHeaderSelection: string;
  let mockShowSubheader: boolean;
  // let mockMemoryRouter: any;
  // let mockHandleDataChange: () => void;

  beforeEach(() => {
    mockOrg = 'jest-test-org';
    mockService = 'jest-test-service';
    mockActiveSubHeaderSelection = 'create';
    mockShowSubheader = true;
    // mockMemoryRouter = ['/users/2'];
    // mockHandleDataChange = () => null;

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
    const rendered = renderer.create(
      <MemoryRouter>
        <AppBarComponent
          org='other-org'
          service='other-service'
          showSubHeader={mockShowSubheader}
          activeSubHeaderSelection='publish'
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
  const desktopWidth: number = 1920;
  const desktopHeight: number = 1080;
  const tabletWidth: number = 900;
  const tabletHeight: number = 500;

  beforeEach(() => {
    window.resizeTo(desktopWidth, desktopHeight);
  });

  it(`desktop header (${desktopWidth}x${desktopHeight})`, () => {
    const mockOrg = 'myDesktopOrg';
    const mockService = 'myDesktopService';
    const mockActiveSubHeaderSelection = 'subHeaderSelection';
    const mockActiveLeftMenuSelection = 'leftmenuselection';

    app = mount(

      <AppBarComponent
        org={mockOrg}
        service={mockService}
        showSubHeader={false}
        activeSubHeaderSelection={mockActiveSubHeaderSelection}
        activeLeftMenuSelection={mockActiveLeftMenuSelection}
      />, { attachTo: document.getElementById('root') }
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

      <AppBarComponent
        org={mockOrg}
        service={mockService}
        showSubHeader={false}
        activeSubHeaderSelection={mockActiveSubHeaderSelection}
        activeLeftMenuSelection={mockActiveLeftMenuSelection}
      />, { attachTo: document.getElementById('root') }
    );
    expect(app.text()).toMatch(`/ ${mockActiveSubHeaderSelection} / ${mockActiveLeftMenuSelection}`);
    expect(app.text()).not.toMatch(`${mockService}${mockOrg}`);
    app.unmount();
  });

});
