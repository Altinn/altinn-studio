import Collapse from '@material-ui/core/Collapse';
import Divider from '@material-ui/core/Divider';
import Drawer from '@material-ui/core/Drawer';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import { withStyles, WithStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import * as React from 'react';
import {leftNavMenuSettings} from './leftNavMenuSettings';
import {styles} from './navMenuStyles';

export interface INavMenuState {
  open: boolean;
  openSubMenus: number[];
}

export interface INavMenuProps extends WithStyles<typeof styles> {}

class NavMenu extends React.Component<any, any> {
  public state = {
    open: false,
    openSubMenus: [] as number[],
    selectedMenuItem: '',
  };

  public toggleNavMenu = () => {
    this.setState((state: any) => {
      return {
        open: !state.open,
      };
    });
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
    const { classes } = this.props;

    return (
      <div style={{top: 64}}>
        <Drawer
          variant='permanent'
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
        >
          <List>
            {leftNavMenuSettings.menuHierarchy.map((menuItem: any, index: number) => {
              return (
              <div key={index}>
                <ListItem
                  button={true}
                  onClick={this.handleMenuItemClicked.bind(this, menuItem, index)}
                  classes={{root: classNames({
                    [classes.selectedMenuItem]: this.state.selectedMenuItem === menuItem.displayText})}}
                >
                  <ListItemText
                    classes={{
                      primary: classNames(classes.menuItemText, {
                        [classes.menuItemTextClosed]: !this.state.open,
                        [classes.selectedMenuItemText]: this.state.selectedMenuItem === menuItem.displayText,
                      }),
                    }}
                    primary={menuItem.displayText}
                  />
                </ListItem>
                {menuItem.items && menuItem.items.length > 0 ?
                  <Collapse
                    in={this.state.openSubMenus.indexOf(index) > -1}
                  >
                    <List component='div' disablePadding={true}>
                      {menuItem.items.map((item: any, i: number) => {
                      return (
                        <ListItem button={true} className={classes.nested} key={i}>
                        <ListItemText
                          inset={true}
                          classes={{primary: classNames(classes.menuSubItemText)}}
                          primary={item.name}
                        />
                        </ListItem>
                      );
                      })}
                    </List>
                  </Collapse>
                : null}
                <Divider />
              </div>
              );
            },
            )}
          </List>
          <List
            classes={{root: classNames(classes.toggleMenu, classes.toggleButton, {
              [classes.toggleButtonOpen]: this.state.open,
              [classes.toggleButtonClosed]: !this.state.open,
            })}}
          >
            <ListItem
              button={true}
              onClick={this.toggleNavMenu}
            >
              <ListItemIcon classes={{root: classNames(classes.toggleMenuText)}}>
                {this.state.open ? <i className='ai ai-back'/> : <i className='ai ai-expand'/>}
              </ListItemIcon>
              <ListItemText
                classes={{primary: classNames(classes.menuItemText, classes.toggleMenuText, {
                  [classes.menuItemTextClosed]: !this.state.open,
                })}}
                primary={'Skjul meny'}
              />
            </ListItem>
          </List>
        </Drawer>
      </div>
    );
  }
}

export default withStyles(styles)(NavMenu);
