import React, { useState } from 'react';
import classNames from 'classnames';
import { Link, useParams } from 'react-router-dom';
import type { IMenuItem } from './drawerMenuSettings';
import { createLeftDrawerMenuSettings, createMainMenuSettings } from './drawerMenuSettings';
import { post } from '../../utils/networking';
import { Button, Collapse, Divider, Drawer, List, ListItem, ListItemText } from '@mui/material';
import classes from './TabletDrawerMenu.module.css';

export interface ITabletDrawerMenuProps {
  handleTabletDrawerMenu: () => void;
  logoutButton?: boolean;
  tabletDrawerOpen: boolean;
  activeLeftMenuSelection?: string;
  activeSubHeaderSelection?: string;
  mainMenuItems: IMenuItem[];
  leftDrawerMenuItems?: { [key: string]: IMenuItem[] };
}

function TabletDrawerMenu({
  logoutButton,
  tabletDrawerOpen,
  leftDrawerMenuItems,
  activeLeftMenuSelection,
  mainMenuItems,
  activeSubHeaderSelection,
  handleTabletDrawerMenu,
}: ITabletDrawerMenuProps) {
  const [openSubMenus, setOpenSubMenus] = useState([]);
  const [selectedMenuItem, setSelectedMenuItem] = useState(activeSubHeaderSelection);

  const handleLogout = () => {
    const altinnWindow: Window = window;
    const url = `${altinnWindow.location.origin}/repos/user/logout`;
    post(url).then(() => {
      window.location.assign(`${altinnWindow.location.origin}/Home/Logout`);
    });
    return true;
  };

  const handleMenuItemClicked = (menuItem: IMenuItem, id: number) => {
    setSelectedMenuItem(menuItem.displayText);
    if (menuItem.items && menuItem.items.length > 0) {
      handleSubmenuClicked(id);
    }
  };

  const handleSubmenuClicked = (id: number) => {
    const openIdIndex = openSubMenus.indexOf(id);
    if (openIdIndex > -1) {
      setOpenSubMenus(openSubMenus.splice(openIdIndex, 1));
    } else {
      setOpenSubMenus([...openSubMenus, id]);
    }
    return {
      openSubMenus,
    };
  };

  const [stateText, buttonClasses] = tabletDrawerOpen
    ? ['lukk', classNames(classes.commonButton, classes.button)]
    : ['meny', classNames(classes.commonButton, classes.closeButton)];
  const leftDrawerMenu = mainMenuItems && createLeftDrawerMenuSettings(leftDrawerMenuItems);
  const { org, app } = useParams();
  return !logoutButton ? (
    <>
      <Drawer
        data-test-id='tablet-drawer-menu'
        variant='persistent'
        anchor='right'
        className={classes.drawer}
        open={tabletDrawerOpen}
        PaperProps={{
          classes: {
            root: classes.drawerMenuPaper,
          },
        }}
        SlideProps={{ appear: false }}
      >
        <List>
          <ListItem button={true} onClick={handleLogout}>
            <ListItemText
              classes={{
                primary: classes.menuItemText,
              }}
              primary='Logg ut'
            />
          </ListItem>
        </List>
        <Divider classes={{ root: classes.divider }} />
        <List>
          {createMainMenuSettings(mainMenuItems).menuItems.map(
            (menuItem: IMenuItem, index: number) => (
              <div key={menuItem.navLink}>
                <ListItem
                  button={true}
                  disableTouchRipple={true}
                  onClick={() => handleMenuItemClicked(menuItem, index)}
                  className={classNames(classes.mainMenuItem, {
                    [classes.activeListItem]:
                      activeSubHeaderSelection === menuItem.activeSubHeaderSelection,
                  })}
                >
                  <ListItemText
                    disableTypography={true}
                    classes={{ root: classes.mainMenuItem }}
                    primary={menuItem.activeSubHeaderSelection}
                  />
                </ListItem>
                {leftDrawerMenu && leftDrawerMenu[menuItem.menuType].length ? (
                  <Collapse
                    in={selectedMenuItem === menuItem.displayText}
                    timeout='auto'
                    unmountOnExit={true}
                  >
                    <List component='span' disablePadding={true}>
                      {leftDrawerMenu[menuItem.menuType].map((item: IMenuItem) => (
                        <Link
                          to={item.navLink.replace(':org', org).replace(':app', app)}
                          style={{ borderBottom: 0 }}
                          key={item.navLink}
                        >
                          <ListItem
                            button={true}
                            disableTouchRipple={true}
                            className={classes.nested}
                          >
                            <ListItemText
                              disableTypography={true}
                              inset={true}
                              primary={item.displayText}
                              classes={{
                                primary: classNames(classes.subMenuItem),
                              }}
                              className={classNames({
                                [classes.activeListItem]:
                                  activeLeftMenuSelection === item.activeLeftMenuSelection,
                              })}
                            />
                          </ListItem>
                        </Link>
                      ))}
                    </List>
                  </Collapse>
                ) : null}
                <Divider classes={{ root: classes.divider }} />
              </div>
            )
          )}
        </List>
      </Drawer>
      <Button
        disableRipple={true}
        disableFocusRipple={true}
        disableTouchRipple={true}
        size='small'
        variant='outlined'
        className={buttonClasses}
        onClick={handleTabletDrawerMenu}
      >
        {stateText}
      </Button>
    </>
  ) : (
    logoutButton && (
      <Button
        size='small'
        variant='outlined'
        className={classNames(classes.commonButton, classes.button)}
        onClick={handleLogout}
      >
        logout
      </Button>
    )
  );
}

export default TabletDrawerMenu;
