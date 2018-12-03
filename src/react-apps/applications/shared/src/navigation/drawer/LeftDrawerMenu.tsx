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
import Icon from './Icon';
import { leftDrawerMenuSettings } from './leftDrawerMenuSettings';
import { styles } from './leftDrawerMenuStyles';

export interface INavMenuProps {
  classes: any;
  theme: any;
  menuType: any;
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

  public render() {
    const { classes } = this.props;

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
            {leftDrawerMenuSettings[this.props.menuType].map((menuItem: any, index: any) => (
              <Link to={menuItem.navLink} style={{ borderBottom: 0 }}>
                <ListItem
                  button={true} key={menuItem.displayText}
                >
                  <ListItemIcon>
                    <Icon iconType={menuItem.iconName} />
                  </ListItemIcon>
                  <ListItemText primary={menuItem.displayText} />
                </ListItem>
              </Link>
            ))}
          </List>
        </Drawer>
      </div>
    );
  }
}

export default withStyles(styles, { withTheme: true })(LeftDrawerMenu);
