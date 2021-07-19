import Button from '@material-ui/core/Button';
import Collapse from '@material-ui/core/Collapse';
import Divider from '@material-ui/core/Divider';
import Drawer from '@material-ui/core/Drawer';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import { withStyles, WithStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import * as React from 'react';
import { Link } from 'react-router-dom';
import { createLeftDrawerMenuSettings, createMainMenuSettings, IMenuItem } from './drawerMenuSettings';
import { styles } from './tabletDrawerMenustyle';
import { post } from '../../utils/networking';

export interface ITabletDrawerMenuProps {
  classes: any;
  handleTabletDrawerMenu: () => void;
  logoutButton?: boolean;
  tabletDrawerOpen: boolean;
  theme: any;
  activeLeftMenuSelection?: string;
  activeSubHeaderSelection?: string;
  mainMenuItems: IMenuItem[];
  leftDrawerMenuItems?: { [key: string]: IMenuItem[] };
}

export interface ITabletDrawerMenuState {
  open: boolean;
  openSubMenus: number[];
  selectedMenuItem: string;
  isTop: boolean;
}

class TabletDrawerMenu extends React.Component<ITabletDrawerMenuProps & WithStyles<typeof styles>,
  ITabletDrawerMenuState> {
  constructor(_props: ITabletDrawerMenuProps) {
    super(_props);
    this.state = {
      open: false,
      openSubMenus: [],
      selectedMenuItem: this.props.activeSubHeaderSelection,
      isTop: true,
    };
  }

  public componentDidMount() {
    document.addEventListener('scroll', () => {
      const isTop = window.scrollY < 20;
      if (isTop !== this.state.isTop) {
        this.setState({ isTop });
      }
    });
  }

  public handleDrawerOpen = () => {
    this.props.handleTabletDrawerMenu();
  }

  public handleDrawerClose = () => {
    this.setState((prev) => ({ open: !prev.open }));
  }

  public handleLogout = () => {
    const altinnWindow: Window = window;
    const url = `${altinnWindow.location.origin}/repos/user/logout`;
    post(url).then(() => {
      window.location.assign(`${altinnWindow.location.origin}/Home/Logout`);
    });
    return true;
  }

  public handleMenuItemClicked = (menuItem: IMenuItem, id: number) => {
    this.setState(() => {
      return {
        selectedMenuItem: menuItem.displayText,
      };
    });
    if (menuItem.items && menuItem.items.length > 0) {
      this.handleSubmenuClicked(id);
    }
  }

  public handleSubmenuClicked = (id: number) => {
    const openIdIndex = this.state.openSubMenus.indexOf(id);
    this.setState((state: any) => {
      if (openIdIndex > -1) {
        state.openSubMenus.splice(openIdIndex, 1);
      } else {
        state.openSubMenus.push(id);
      }
      return {
        openSubMenus: state.openSubMenus,
      };
    });
  }

  public render() {
    const {
      classes, logoutButton,
      tabletDrawerOpen, leftDrawerMenuItems,
      activeLeftMenuSelection,
      mainMenuItems,
    } = this.props;
    const [stateText, buttonClasses] = tabletDrawerOpen ?
      ['lukk', classNames(classes.commonButton, classes.button)] :
      ['meny', classNames(classes.commonButton, classes.closeButton)];
    const leftDrawerMenu = mainMenuItems && createLeftDrawerMenuSettings(leftDrawerMenuItems);
    return (
      !logoutButton ? (
        <>
          <Drawer
            variant='persistent'
            anchor='right'
            className={classNames(classes.drawer, {
              [classes.drawerOpen]: tabletDrawerOpen,
              [classes.drawerClose]: !tabletDrawerOpen,
            })}
            classes={{
              paper: classNames(classes.paper, {
                [classes.drawerOpen]: tabletDrawerOpen,
                [classes.drawerClose]: !tabletDrawerOpen,
              }),
            }}
            open={tabletDrawerOpen}
            PaperProps={{ classes: { root: this.state.isTop ? classes.drawerMenuPaper : classes.drawerMenu } }}
          >
            <List
              classes={{
                root: classNames(classes.toggleMenu, classes.toggleButton),
              }}
            >
              <ListItem
                button={true}
                onClick={this.handleLogout}
                classes={{
                  root: classNames(classes.menuItem),
                }}
              >
                <ListItemText
                  classes={{
                    primary: classNames(classes.menuItemText),
                  }}
                  primary='Logg ut'
                />
              </ListItem>
            </List>
            <Divider classes={{ root: classNames(classes.divider) }} />
            <List>
              {createMainMenuSettings(mainMenuItems).menuItems.map((menuItem: IMenuItem, index: number) => (
                <div key={menuItem.navLink}>
                  <ListItem
                    button={true}
                    disableTouchRipple={true}
                    onClick={() => this.handleMenuItemClicked(menuItem, index)}
                    className={classNames(classes.mainMenuItem, {
                      [classes.activeListItem]: this.props.activeSubHeaderSelection ===
                        menuItem.activeSubHeaderSelection,
                    })}
                  >
                    <ListItemText
                      disableTypography={true}
                      classes={{ root: classNames(classes.mainMenuItem) }}
                      primary={menuItem.activeSubHeaderSelection}
                    />
                  </ListItem>
                  {leftDrawerMenu && (leftDrawerMenu[menuItem.menuType].length) ? (
                    <Collapse
                      in={this.state.selectedMenuItem ===
                        menuItem.displayText}
                      timeout='auto'
                      unmountOnExit={true}
                    >
                      <List
                        component='span'
                        disablePadding={true}
                      >
                        {leftDrawerMenu[menuItem.menuType].map((item: IMenuItem) => (
                          <Link
                            to={item.navLink}
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
                                classes={{ primary: classNames(classes.subMenuItem) }}
                                className={classNames({
                                  [classes.activeListItem]: activeLeftMenuSelection ===
                                    item.activeLeftMenuSelection,
                                })}
                              />
                            </ListItem>
                          </Link>
                        ))}
                      </List>
                    </Collapse>) : null}
                  <Divider classes={{ root: classNames(classes.divider) }} />
                </div>
              ))}
            </List>
          </Drawer>
          <Button
            disableRipple={true}
            disableFocusRipple={true}
            disableTouchRipple={true}
            size='small'
            variant='outlined'
            className={buttonClasses}
            onClick={this.handleDrawerOpen}
          >
            {stateText}
          </Button>
        </>
      ) : logoutButton && (
        <Button
          size='small'
          variant='outlined'
          className={classNames(classes.commonButton, classes.button)}
          onClick={this.handleLogout}
        >
          logout
        </Button>
      )

    );
  }
}

export default withStyles(styles, { withTheme: true })(TabletDrawerMenu);
