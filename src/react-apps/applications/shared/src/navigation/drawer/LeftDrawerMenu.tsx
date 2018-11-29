import CssBaseline from '@material-ui/core/CssBaseline';
import Divider from '@material-ui/core/Divider';
import Drawer from '@material-ui/core/Drawer';
import IconButton from '@material-ui/core/IconButton';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import { withStyles, WithStyles } from '@material-ui/core/styles';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import InformationIcon from '@material-ui/icons/Info';
import SettingsIcon from '@material-ui/icons/Settings';
import classNames from 'classnames';
import * as React from 'react';
import { leftDrawerMenuSettings } from './leftDrawerMenuSettings';
import { styles } from './leftDrawerMenuStyles';

export interface INavMenuProps {
  classes: any;
  theme: any;
}

export interface INavMenuProps extends WithStyles<typeof styles> { }

class LeftDrawerMenu extends React.Component<INavMenuProps, any> {
  public state = {
    open: false,
    openSubMenus: [] as number[],
  };

  public handleDrawerOpen = () => {
    this.setState({ open: true });
  }

  public handleDrawerClose = () => {
    this.setState({ open: false });
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

  public handleMenuItemClicked = (menuItem: any, id: number) => {
    this.setState((state: any) => {
      return {
        selectedMenuItem: menuItem.displayText,
      };
    });
    if (menuItem.items && menuItem.items.length > 0) {
      this.handleSubmenuClicked(id);
    }

    window.location = menuItem.navLink;
  }

  public render() {
    const { classes, theme } = this.props;

    return (
      <div className={classes.root}>
        <CssBaseline />
        <Drawer
          variant='permanent'
          onMouseOver={this.handleDrawerOpen}
          onMouseLeave={this.handleDrawerClose}
          className={classNames(classes.drawer, {
            [classes.drawerOpen]: this.state.open,
            [classes.drawerClose]: !this.state.open,
          })}
          classes={{
            paper: classNames({
              [classes.drawerOpen]: this.state.open,
              [classes.drawerClose]: !this.state.open,
            }),
          }}
          open={this.state.open}
        >
          <div className={classes.toolbar}>
            <IconButton onClick={this.handleDrawerClose}>
              {theme.direction === 'rtl' ? (
                <ChevronRightIcon />
              ) : (
                  <ChevronLeftIcon />
                )}
            </IconButton>
          </div>
          <Divider />
          <List>
            {leftDrawerMenuSettings.menuHierarchy.map((menuItem: any, index: any) => (
              <ListItem button={true} key={menuItem.displayText}
                onClick={this.handleMenuItemClicked.bind(this, menuItem, index)}>
                <ListItemIcon>
                  {index % 2 === 0 ? <InformationIcon /> : <SettingsIcon />}
                </ListItemIcon>
                <ListItemText primary={menuItem.displayText} />
              </ListItem>
            ))}
          </List>
          <Divider />
        </Drawer>
      </div>
    );
  }
}

export default withStyles(styles, { withTheme: true })(LeftDrawerMenu);
