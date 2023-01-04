import React from 'react';
import cn from 'classnames';
import { Link, useParams } from 'react-router-dom';
import AltinnIcon from '../../components/AltinnIcon';
import type { IMenuItem } from './drawerMenuSettings';
import { createLeftDrawerMenuSettings } from './drawerMenuSettings';

import classes from './LeftDrawerMenu.module.css';

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
  const [iconColor, setIconColor] = React.useState<any>({});
  const [open, setOpen] = React.useState<boolean>(false);
  const { org, app } = useParams();
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
      [index]: '#0062BA',
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
    <div className={classes.drawerWrapper}>
      <ul
        data-test-id='left-drawer-menu'
        onMouseOver={handleDrawerOpen}
        onMouseLeave={handleDrawerClose}
        className={cn(classes.drawer, open ? classes.drawerOpen : classes.drawerClosed)}
      >
        {menuToRender.map((menuItem: IMenuItem, index: number) => (
          <li key={menuItem.displayText}>
            <Link
              className={classes.menuLink}
              to={menuItem.navLink.replace(':org', org).replace(':app', app)}
              data-testid={`leftMenu_${menuItem.navLink.replace('/:org/:app/', '')}`}
            >
              <span
                className={cn(
                  classes.listItem,
                  activeLeftMenuSelection === menuItem.activeLeftMenuSelection &&
                    classes.activeListItem
                )}
                onMouseEnter={onMouseEnterListItem(index)}
                onMouseLeave={onMouseLeaveListItem(index)}
              >
                <AltinnIcon
                  isActive={activeLeftMenuSelection === menuItem.activeLeftMenuSelection}
                  isActiveIconColor='#0062BA'
                  iconClass={menuItem.iconClass}
                  iconColor={
                    iconColor[index] === undefined ? 'rgba(0, 0, 0, 0.54)' : iconColor[index]
                  }
                />
                <span className={classes.listItemText}>{menuItem.displayText}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
