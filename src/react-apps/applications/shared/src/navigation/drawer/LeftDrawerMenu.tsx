import Divider from '@material-ui/core/Divider';
import Drawer from '@material-ui/core/Drawer';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import { withStyles, WithStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import * as React from 'react';
import { Link } from 'react-router-dom';
import { IMenuItem, leftDrawerMenuSettings } from './drawerMenuSettings';
import AltinnIcon from './AltinnIcon';
import { styles } from './leftDrawerMenuStyles';

export interface ILeftDrawerMenuProps extends WithStyles<typeof styles> {

  menuType: string;
  activeLeftMenuSelection: string;
}

export interface ILeftDrawerMenuState {
  open: boolean;
  openSubMenus: number[];
}

class LeftDrawerMenu extends
  React.Component<ILeftDrawerMenuProps, ILeftDrawerMenuState> {
  constructor(_props: ILeftDrawerMenuProps) {
    super(_props);
    this.state = {
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
                <Link
                  to={menuItem.navLink}
                  style={{ borderBottom: 0 }}
                  key={index}
                >
                  <ListItem
                    classes={{
                      root: classNames(classes.listItem,
                        {
                          [classes.activeListItem]: this.props.activeLeftMenuSelection ===
                            menuItem.activeLeftMenuSelection,
                        },
                      ),
                    }}
                  >
                    <ListItemIcon>
                      <AltinnIcon
                        isActive={this.props.activeLeftMenuSelection ===
                          menuItem.activeLeftMenuSelection}
                        iconClass={menuItem.iconClass}
                      />
                    </ListItemIcon>
                    <ListItemText
                      disableTypography={true}
                      primary={menuItem.displayText}
                    />
                  </ListItem>
                </Link>
              ))}
            </List>
          </Drawer>
        </div>
      );
    }
  }
}

export default withStyles(styles, { withTheme: true })(LeftDrawerMenu);
