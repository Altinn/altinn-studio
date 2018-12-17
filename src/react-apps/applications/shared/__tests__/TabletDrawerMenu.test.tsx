import * as React from 'react';
import TabletDrawerMenu from '../src/navigation/drawer/TabletDrawerMenu';
import { mount } from 'enzyme';
import { createMuiTheme, MuiThemeProvider } from '@material-ui/core/styles';
import altinnTheme from '../src/theme/altinnStudioTheme';

describe('render tablet menu', () => {
  let tabletDrawerMenu: any;
  let open: boolean;
  const tabletWidth: number = 1024;
  const tabletHeight: number = 768;
  let mockHandleTabletDrawerMenu: () => void;

  const theme = createMuiTheme(altinnTheme);

  beforeEach(() => {
    open: false;
    mockHandleTabletDrawerMenu = () => null;
    window.resizeTo(tabletWidth, tabletHeight);
  });

  it('should render tablet view for the appbar that matches the snapshot', () => {

    tabletDrawerMenu = mount(
      <MuiThemeProvider theme={theme}>
        <TabletDrawerMenu
          tabletDrawerOpen={open}
          handleTabletDrawerMenu={mockHandleTabletDrawerMenu}
        />
      </MuiThemeProvider>, { attachTo: document.getElementById('root') },
    );
    expect(tabletDrawerMenu).toMatchSnapshot();
    tabletDrawerMenu.unmount();
  });

  it('should render tablet menu when the menu button is clicked that matches the snapshot', () => {

    tabletDrawerMenu = mount(
      <MuiThemeProvider theme={theme}>
        <TabletDrawerMenu
          tabletDrawerOpen={open}
          handleTabletDrawerMenu={mockHandleTabletDrawerMenu}
        />
      </MuiThemeProvider>, { attachTo: document.getElementById('root') },
    );
    // const spy = jest.spyOn(tabletDrawerMenu.instance(), 'handleTabletDrawerMenu');
    // console.log(tabletDrawerMenu.debug());
    // const menuButton = tabletDrawerMenu.find('Button[variant="outlined"]');
    // const menuButton = tabletDrawerMenu.find('button');
    tabletDrawerMenu.find('button').prop('onClick')();
    tabletDrawerMenu.update();
    // expect(tabletDrawerMenu.find('button').text()).toEqual('lukk');
    expect(tabletDrawerMenu.find('Drawer[variant="persistent"]').prop('open')).toEqual(true);

    tabletDrawerMenu.unmount();
  });
});
