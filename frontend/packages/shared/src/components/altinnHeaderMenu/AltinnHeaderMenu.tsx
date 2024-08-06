import React, { useState, type ReactElement } from 'react';
import classes from './AltinnHeaderMenu.module.css';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TopBarMenuGroup, TopBarMenuItem } from 'app-shared/types/TopBarMenuItem';
import {
  StudioButton,
  StudioNavigationMenu,
  StudioNavigationMenuSmall,
  useIsSmallWidth,
} from '@studio/components';
import { MenuHamburgerIcon } from '@studio/icons';
import { groupMenuItemsByGroup } from 'app-development/layout/AppBar/appBarConfig';
import { TopBarGroup } from 'app-shared/enums/TopBarMenu';
import { Link } from '@digdir/designsystemet-react';

export interface IAltinnHeaderMenuProps {
  menuItems: TopBarMenuItem[];
  windowResizeWidth: number;
}

export const AltinnHeaderMenu = ({ menuItems, windowResizeWidth }: IAltinnHeaderMenuProps) => {
  const { t } = useTranslation();

  const isSmallWidth = useIsSmallWidth(windowResizeWidth);

  const groupedMenuItems: TopBarMenuGroup[] = groupMenuItemsByGroup(menuItems);

  if (!menuItems?.length) return null;

  if (isSmallWidth) {
    return (
      <StudioNavigationMenuSmall
        menuGroups={groupedMenuItems.map((menuGroup: TopBarMenuGroup) => ({
          name: menuGroup.groupName,
          showName: menuGroup.groupName === TopBarGroup.Tools,
          items: menuGroup.menuItems.map((menuItem: TopBarMenuItem) => ({
            link: menuItem.link,
            name: t(menuItem.key),
            isBeta: menuItem.isBeta,
            LinkComponent: LinkComponentSmall,
          })),
        }))}
        windowResizeWidth={windowResizeWidth}
        anchorButtonProps={{
          icon: <MenuHamburgerIcon />,
          variant: 'tertiary',
          color: 'inverted',
          children: t('top_menu.menu'),
        }}
      />
    );
  }

  return (
    <StudioNavigationMenu
      menuItems={menuItems.map((menuItem: TopBarMenuItem) => ({
        link: menuItem.link,
        name: t(menuItem.key),
        isBeta: menuItem.isBeta,
        StudioNavigationLinkComponent: LinkComponent,
      }))}
      windowResizeWidth={windowResizeWidth}
      anchorButtonProps={{
        icon: <MenuHamburgerIcon />,
        variant: 'tertiary',
        color: 'inverted',
        children: t('top_menu.menu'),
      }}
    />
  );
};

type LinkComponentProps = { link: string; text: string };

const LinkComponent = ({ link, text }: LinkComponentProps): ReactElement => {
  // TODO - Separate file
  // TODO - Add previw and deploy buttons
  return (
    <NavLink to={link} className={({ isActive }) => (isActive ? classes.active : '')}>
      {text}
    </NavLink>
  );
};

const LinkComponentSmall = ({ link, text }: LinkComponentProps): ReactElement => {
  // TODO - Separate file
  // TODO - Add previw and deploy buttons
  return (
    <StudioButton asChild variant='tertiary' size='md' fullWidth className={classes.smallLink}>
      <NavLink to={link} className={({ isActive }) => (isActive ? classes.active : '')}>
        {text}
      </NavLink>
    </StudioButton>
  );
};
