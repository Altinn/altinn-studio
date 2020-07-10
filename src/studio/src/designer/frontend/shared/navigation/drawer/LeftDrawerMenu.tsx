import Divider from '@material-ui/core/Divider';
import Drawer from '@material-ui/core/Drawer';
import List from '@material-ui/core/List';
import { withStyles, WithStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import * as React from 'react';
import ListItemLink from './ListItemLink';
import { IMenuItem, leftDrawerMenuSettings } from './drawerMenuSettings';
import { styles } from './leftDrawerMenuStyles';

import altinnTheme from '../../theme/altinnStudioTheme';

export interface ILeftDrawerMenuProps extends WithStyles<typeof styles> {
  menuType: string;
  activeLeftMenuSelection: string;
}

export interface ILeftDrawerMenuState {
  iconColor: any;
  open: boolean;
  openSubMenus: number[];
}

class LeftDrawerMenu extends
  React.Component<ILeftDrawerMenuProps, ILeftDrawerMenuState> {
  constructor(_props: ILeftDrawerMenuProps) {
    super(_props);
    this.state = {
      iconColor: {},
      open: false,
      openSubMenus: [],
    };
  }

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

  public onMouseEnterListItem = (index: any) => (event: any) => {
    event.stopPropagation();
    this.setState((state) => {
      return {
        iconColor: {
          ...state.iconColor,
          [index]: altinnTheme.altinnPalette.primary.blueDark,
        },
      };
    });
  }

  public onMouseLeaveListItem = (index: any) => (event: any) => {
    this.setState((state) => {
      return {
        iconColor: {
          ...state.iconColor,
          [index]: 'rgba(0, 0, 0, 0.54)',
        },
      };
    });
  }

  public render() {
    const { classes } = this.props;
    const menuToRender = leftDrawerMenuSettings[this.props.menuType];

    if (!this.props.menuType || !menuToRender) {
      return (
        <div />
      );
    } else {
      return (
        <div>
          <Drawer
            variant='permanent'
            onMouseOver={this.handleDrawerOpen}
            onMouseLeave={this.handleDrawerClose}
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
            <Divider />

            <List>
              {leftDrawerMenuSettings[this.props.menuType].map((menuItem: IMenuItem, index: number) => (
                <ListItemLink
                  to={menuItem.navLink}
                  key={index}
                  classes={classes}
                  menuItem={menuItem}
                  index={index}
                  activeLeftMenuSelection={this.props.activeLeftMenuSelection === menuItem.activeLeftMenuSelection}
                  onMouseEnterListItem={this.onMouseEnterListItem(index)}
                  onMouseLeaveListItem={this.onMouseLeaveListItem(index)}
                  state={this.state}
                />
              ))}
            </List>
          </Drawer>
        </div>
      );
    }
  }
}

export default withStyles(styles, { withTheme: true })(LeftDrawerMenu);
