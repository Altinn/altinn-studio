import Divider from '@material-ui/core/Divider';
import Drawer from '@material-ui/core/Drawer';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import { makeStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import * as React from 'react';
import { Link } from 'react-router-dom';
import AltinnIcon from '../../components/AltinnIcon';
import { IMenuItem } from './drawerMenuSettings';
import { styles } from './leftDrawerMenuStyles';

import altinnTheme from '../../theme/altinnStudioTheme';

const useStyles = makeStyles(styles);

export interface ILeftDrawerMenuProps {
  menuType: string;
  activeLeftMenuSelection: string;
  leftMenuItems: { [key: string]: IMenuItem[] };
}

export default function LeftDrawerMenu({ menuType, activeLeftMenuSelection, leftMenuItems }: ILeftDrawerMenuProps) {
  const classes = useStyles();

  const [iconColor, setIconColor] = React.useState<any>({});
  const [open, setOpen] = React.useState<boolean>(false);

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  const onMouseEnterListItem = (index: any) => (event: any) => {
    event.stopPropagation();
    const newIconColor = {
      ...iconColor,
      [index]: altinnTheme.altinnPalette.primary.blueDark,
    };
    setIconColor(newIconColor);
  };

  const onMouseLeaveListItem = (index: any) => () => {
    const newIconColor = {
      ...iconColor,
      [index]: 'rgba(0, 0, 0, 0.54)',
    };
    setIconColor(newIconColor);
  };

  const menuToRender = leftMenuItems[menuType];

  if (!menuType || !menuToRender) {
    return (
      <div />
    );
  }

  return (
    <div>
      <Drawer
        variant='permanent'
        onMouseOver={handleDrawerOpen}
        onMouseLeave={handleDrawerClose}
        className={classNames(classes.drawer, {
          [classes.drawerOpen]: open,
          [classes.drawerClose]: !open,
        })}
        classes={{
          paper: classNames(classes.paper, {
            [classes.drawerOpen]: open,
            [classes.drawerClose]: !open,
          }),
        }}
        open={open}
      >
        <Divider />
        <List component='nav'>
          {menuToRender.map((menuItem: IMenuItem, index: number) => (
            <Link
              to={menuItem.navLink}
              style={{ borderBottom: 0 }}
              key={menuItem.displayText}
            >
              <ListItem
                classes={{
                  root: classNames(classes.listItem,
                    {
                      [classes.activeListItem]: activeLeftMenuSelection ===
                        menuItem.activeLeftMenuSelection,
                    }),
                }}
                onMouseEnter={onMouseEnterListItem(index)}
                onMouseLeave={onMouseLeaveListItem(index)}
                component='div'
              >
                <ListItemIcon>
                  <AltinnIcon
                    isActive={activeLeftMenuSelection ===
                      menuItem.activeLeftMenuSelection}
                    isActiveIconColor={altinnTheme.altinnPalette.primary.blueDark}
                    iconClass={menuItem.iconClass}
                    iconColor={iconColor[index] === undefined
                      ? 'rgba(0, 0, 0, 0.54)' : iconColor[index]}
                  />
                </ListItemIcon>
                <ListItemText
                  disableTypography={true}
                  primary={menuItem.displayText}
                  classes={{ root: classNames(classes.listItemText) }}
                />
              </ListItem>
            </Link>
          ))}
        </List>
      </Drawer>
    </div>
  );
}
