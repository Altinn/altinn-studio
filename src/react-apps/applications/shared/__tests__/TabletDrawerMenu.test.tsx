import { createMuiTheme, MuiThemeProvider } from '@material-ui/core/styles';
import { mount } from 'enzyme';
import { shallow } from 'enzyme';
import 'jest';
import * as React from 'react';
import * as renderer from 'react-test-renderer';
import TabletDrawerMenu from '../src/navigation/drawer/TabletDrawerMenu';
import altinnTheme from '../src/theme/altinnStudioTheme';

describe('>>> shared/src/navigation/drawer/TabletDrawerMenu.tsx', () => {
  describe('when the tabletDrawerOpen is true', () => {
    let mockTabletDrawerOpen: boolean;
    let mockHandleTabletDrawerMenu: () => void;

    const theme = createMuiTheme(altinnTheme);

    beforeEach(() => {
      mockTabletDrawerOpen = true;
      mockHandleTabletDrawerMenu = jest.fn();
    });

    it('should render tablet menu and the mock function should have been called, ', () => {

      const tabletDrawerMenu = mount(
        <MuiThemeProvider theme={theme}>
          <TabletDrawerMenu
            tabletDrawerOpen={mockTabletDrawerOpen}
            handleTabletDrawerMenu={mockHandleTabletDrawerMenu}
          />
        </MuiThemeProvider>, { attachTo: document.getElementById('root') },
      );

      tabletDrawerMenu.update();
      tabletDrawerMenu.find('button').simulate('click');
      expect(mockHandleTabletDrawerMenu).toHaveBeenCalled();
      expect(tabletDrawerMenu.find('button').text()).toEqual('lukk');
      expect(tabletDrawerMenu.find('Drawer[variant="persistent"]').prop('open')).toEqual(true);
      tabletDrawerMenu.unmount();
    });
  });

  describe('when the tabletDrawerOpen is true', () => {
    let mockTabletDrawerOpen: boolean;
    let mockHandleTabletDrawerMenu: () => void;

    beforeEach(() => {
      mockTabletDrawerOpen = true;
      mockHandleTabletDrawerMenu = jest.fn();
    });

    it('should render tablet menu and menu items must match the snapshot ', () => {

      const tabletDrawerMenu = renderer.create(
        <TabletDrawerMenu
          tabletDrawerOpen={mockTabletDrawerOpen}
          handleTabletDrawerMenu={mockHandleTabletDrawerMenu}
        />,
      );
      expect(tabletDrawerMenu).toMatchSnapshot();
    });
  });

  describe('when the tabletDrawerOpen property is false', () => {
    let mockTabletDrawerOpen: boolean;
    let mockHandleTabletDrawerMenu: () => void;

    beforeEach(() => {
      mockTabletDrawerOpen = false;
      mockHandleTabletDrawerMenu = jest.fn();
    });

    it(`should render menu button and the tablet menu must not be visible
        and menu items must match the snapshot`, () => {

        const tabletDrawerMenu = shallow(
          <TabletDrawerMenu
            tabletDrawerOpen={mockTabletDrawerOpen}
            handleTabletDrawerMenu={mockHandleTabletDrawerMenu}
          />,
        );
        expect(tabletDrawerMenu).toMatchSnapshot();
      });
  });
});
