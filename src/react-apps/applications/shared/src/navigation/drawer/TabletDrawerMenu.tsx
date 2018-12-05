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
import { leftDrawerMenuSettings } from './drawerMenuSettings';
import { mainMenuSettings } from './drawerMenuSettings';
import { styles } from './tabletDrawerMenustyle';

export interface IDrawerMenuProps {
  classes: any;
  theme: any;
  menuType: any;
}

export interface IDrawerMenuProps extends WithStyles<typeof styles> { }

class TabletDrawerMenu extends React.Component<IDrawerMenuProps, any> {
  public state = {
    open: false,
    openSubMenus: [] as number[],
    selectedMenuItem: '',
  };

  public handleDrawerOpen = () => {
    this.setState({ open: true });
  }

  public handleDrawerClose = () => {
    this.setState({ open: false });
  }

  public handleMenuItemClicked = (menuItem: any, id: number) => {
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
    const { classes } = this.props;

    return (
      <div>
        {/*<AppBar
          position='fixed'
          className={classNames(classes.appBar, {
            [classes.appBarShift]: open,
          })}
        >
          <Toolbar disableGutters={!open}>
            <IconButton
              color='inherit'
              aria-label='Open drawer'
              onClick={this.handleDrawerOpen}
              className={classNames(classes.menuButton, open && classes.hide)}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant='h6' color='inherit' noWrap={true}>
              Persistent drawer
            </Typography>
          </Toolbar>
        </AppBar>*/}
        <Drawer
          variant='persistent'
          className={classNames(classes.drawer, {
            [classes.drawerOpen]: this.state.open,
            [classes.drawerClose]: !this.state.open,
          })}
          classes={{
            paper: classNames(classes.paper, {
              [classes.drawerOpen]: this.state.open,
              [classes.drawerClose]: !this.state.open,
            }),
          }}
          open={this.state.open}
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
                onClick={this.handleDrawerClose}
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
              {mainMenuSettings.menuItems.map((menuItem: any, index: any) => {
                return (
                  <div key={index}>
                    <ListItem
                      button={true} key={index}
                      onClick={this.handleMenuItemClicked.bind(this, menuItem, index)}
                    >
                      <ListItemText
                        classes={{ primary: classNames(classes.mainMenuItemText) }}
                        primary={menuItem.displayText} />
                    </ListItem>
                    {leftDrawerMenuSettings[menuItem.menuType].length > 0 ?
                      <Collapse in={this.state.openSubMenus.indexOf(index) > -1} timeout='auto' unmountOnExit={true}>
                        <List component='div' disablePadding={true}>
                          {leftDrawerMenuSettings[menuItem.menuType].map((item: any, i: number) => {
                            return (
                              <Link to={item.navLink} style={{ borderBottom: 0 }} key={i}>
                                <ListItem button={true} className={classes.nested} key={i}>
                                  <ListItemText
                                    inset={true}
                                    classes={{ primary: classNames(classes.menuSubItemText) }}
                                    primary={item.displayText}
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
    );
  }
}

export default withStyles(styles, { withTheme: true })(TabletDrawerMenu);
