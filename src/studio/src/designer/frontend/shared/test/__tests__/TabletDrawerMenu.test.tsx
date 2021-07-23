import { createTheme, MuiThemeProvider } from '@material-ui/core/styles';
import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import TabletDrawerMenu from '../../navigation/drawer/TabletDrawerMenu';
import altinnTheme from '../../theme/altinnStudioTheme';

describe('>>> shar../../navigation/drawer/TabletDrawerMenu.tsx', () => {
  describe('when the tabletDrawerOpen is true', () => {
    let mockTabletDrawerOpen: boolean;
    let mockHandleTabletDrawerMenu: () => void;

    const theme = createTheme(altinnTheme);

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
      expect(tabletDrawerMenu.find('WithStyles(ForwardRef(Drawer))[variant="persistent"]').prop('open')).toEqual(true);
      tabletDrawerMenu.unmount();
    });
  });
});
