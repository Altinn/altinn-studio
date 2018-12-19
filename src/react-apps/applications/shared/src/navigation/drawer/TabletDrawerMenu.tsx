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
import { IMenuItem, leftDrawerMenuSettings } from './drawerMenuSettings';
import { mainMenuSettings } from './drawerMenuSettings';
import { styles } from './tabletDrawerMenustyle';

export interface ITabletDrawerMenuProps {
  classes: any;
  handleTabletDrawerMenu: () => void;
  logoutButton?: boolean;
  tabletDrawerOpen: boolean;
  theme: any;
}

export interface ITabletDrawerMenuState {
  open: boolean;
  openSubMenus: number[];
  selectedMenuItem: string;
}

class TabletDrawerMenu extends React.Component<ITabletDrawerMenuProps & WithStyles<typeof styles>,
  ITabletDrawerMenuState> {

  constructor(_props: ITabletDrawerMenuProps) {
    super(_props);
    this.state = {
      open: false,
      openSubMenus: [],
      selectedMenuItem: '',
    };
  }

  public handleDrawerOpen = () => {
    this.props.handleTabletDrawerMenu();
  }

  public handleDrawerClose = () => {
    this.setState({ open: !this.state.open });
  }

  public handleLogout = () => {
    if (window) {
      window.location.href = '/Home/Logout';
    }
    return true;
  }

  public handleMenuItemClicked = (menuItem: IMenuItem, id: number) => {
    this.setState((state: any) => {
      return {
        selectedMenuItem: menuItem.displayText,
      };
    });
    this.handleSubmenuClicked(id);
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
    const { classes, logoutButton } = this.props;

    return (
      !logoutButton ? (
        <div>
          <Button
            size='small'
            variant='outlined'
            className={classes.button}
            onClick={this.handleDrawerOpen}
          >
            {this.props.tabletDrawerOpen ? 'lukk' : 'meny'}
          </Button>
          <Drawer
            variant='persistent'
            className={classNames(classes.drawer, {
              [classes.drawerOpen]: this.props.tabletDrawerOpen,
              [classes.drawerClose]: !this.props.tabletDrawerOpen,
            })}
            classes={{
              paper: classNames(classes.paper, {
                [classes.drawerOpen]: this.props.tabletDrawerOpen,
                [classes.drawerClose]: !this.props.tabletDrawerOpen,
              }),
            }}
            open={this.props.tabletDrawerOpen}
            PaperProps={{ classes: { root: classes.drawerMenuPaper } }}
          >
            <div style={{ width: '50%' }}>
              <List
                classes={{
                  root: classNames(classes.toggleMenu, classes.toggleButton)
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
                    primary={'Logg ut'}
                  />
                </ListItem>
              </List>
              <Divider classes={{ root: classNames(classes.divider) }} />
              <List>
                {mainMenuSettings.menuItems.map((menuItem: IMenuItem, index: number) => {
                  return (
                    <div key={index}>
                      <ListItem
                        button={true}
                        key={index}
                        onClick={this.handleMenuItemClicked.bind(this, menuItem, index)}
                      >
                        <ListItemText
                          classes={{ primary: classNames(classes.mainMenuItemText) }}
                          primary={menuItem.displayText}
                        />
                      </ListItem>
                      {leftDrawerMenuSettings[menuItem.menuType].length > 0 ?
                        <Collapse in={this.state.openSubMenus.indexOf(index) > -1} timeout='auto' unmountOnExit={true}>
                          <List component='div' disablePadding={true}>
                            {leftDrawerMenuSettings[menuItem.menuType].map((item: IMenuItem, i: number) => {
                              return (
                                <Link to={item.navLink} style={{ borderBottom: 0 }} key={i}>
                                  <ListItem
                                    button={true}
                                    className={classes.nested}
                                    key={i}
                                  >
                                    <ListItemText
                                      inset={true}
                                      primary={item.displayText}
                                      classes={{ primary: classNames(classes.subMenuItem) }}
                                    />
                                  </ListItem>
                                </Link>
                              );
                            })}
                          </List>
                        </Collapse>
                        : null}
                      <Divider classes={{ root: classNames(classes.divider) }} />
                    </div>
                  );
                },
                )}
              </List>
            </div>
          </Drawer>
        </div>

      ) : logoutButton && (
        <Button
          size='small'
          variant='outlined'
          className={classes.button}
          onClick={this.handleLogout}
        >
          logout
        </Button>
      )

    );
  }
}

export default withStyles(styles, { withTheme: true })(TabletDrawerMenu);
