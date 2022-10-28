import React from 'react';
import { makeStyles } from '@mui/styles';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import classNames from 'classnames';
import { Link } from 'react-router-dom';
import AltinnIcon from '../../components/AltinnIcon';
import type { IMenuItem } from './drawerMenuSettings';
import { createLeftDrawerMenuSettings } from './drawerMenuSettings';
import { styles } from './leftDrawerMenuStyles';

import altinnTheme from '../../theme/altinnStudioTheme';

const useStyles = makeStyles(styles);

export interface ILeftDrawerMenuProps {
  menuType: string;
  activeLeftMenuSelection: string;
  leftMenuItems: { [key: string]: IMenuItem[] };
}

export default function LeftDrawerMenu({
  menuType,
  activeLeftMenuSelection,
  leftMenuItems,
}: ILeftDrawerMenuProps) {
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

  const menuToRender = createLeftDrawerMenuSettings(leftMenuItems)[menuType];

  if (!menuType || !menuToRender) {
    return <div />;
  }

  return (
    <Drawer
      data-test-id='left-drawer-menu'
      variant='permanent'
      onMouseOver={handleDrawerOpen}
      onMouseLeave={handleDrawerClose}
      PaperProps={{
        sx: {
          position: 'absolute',
          background: altinnTheme.altinnPalette.primary.greyLight,
          top: 111,
          height: `calc(100vh - 110px)`,
          overflow: 'hidden',
        },
      }}
      classes={{
        paper: classNames({
          [classes.drawerOpen]: open,
          [classes.drawerClose]: !open,
        }),
      }}
      open={open}
    >
      <List component='nav'>
        {menuToRender.map((menuItem: IMenuItem, index: number) => (
          <Link
            to={menuItem.navLink}
            style={{ borderBottom: 0 }}
            key={menuItem.displayText}
          >
            <ListItem
              classes={{
                root: classNames(classes.listItem, {
                  [classes.activeListItem]:
                    activeLeftMenuSelection ===
                    menuItem.activeLeftMenuSelection,
                }),
              }}
              onMouseEnter={onMouseEnterListItem(index)}
              onMouseLeave={onMouseLeaveListItem(index)}
              component='div'
            >
              <ListItemIcon>
                <AltinnIcon
                  isActive={
                    activeLeftMenuSelection === menuItem.activeLeftMenuSelection
                  }
                  isActiveIconColor={altinnTheme.altinnPalette.primary.blueDark}
                  iconClass={menuItem.iconClass}
                  iconColor={
                    iconColor[index] === undefined
                      ? 'rgba(0, 0, 0, 0.54)'
                      : iconColor[index]
                  }
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
  );
}
