import React, { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { TopBarMenuGroup, TopBarMenuItem } from 'app-shared/types/TopBarMenuItem';
import { useIsSmallWidth } from '@studio/components';
import { MenuHamburgerIcon } from '@studio/icons';
import { groupMenuItemsByGroup } from 'app-development/layout/AppBar/appBarConfig';
import { TopBarGroup } from 'app-shared/enums/TopBarMenu';
import { LargeNavigationMenu } from './LargeNavigationMenu';
import { type NavigationMenuSmallGroup } from 'app-development/types/HeaderMenu/NavigationMenuSmallGroup';
import { SmallNavigationMenu } from './SmallNavigationMenu';

export type HeaderMenuProps = {
  menuItems: TopBarMenuItem[];
  windowResizeWidth: number;
};

export const HeaderMenu = ({ menuItems, windowResizeWidth }: HeaderMenuProps): ReactElement => {
  const { t } = useTranslation();

  const isSmallWidth = useIsSmallWidth(windowResizeWidth);

  const groupedMenuItems: TopBarMenuGroup[] = groupMenuItemsByGroup(menuItems);

  if (!menuItems.length) return null;

  if (isSmallWidth) {
    return (
      <SmallNavigationMenu
        menuGroups={[...groupedMenuItems.map(mapMenuGroup)]}
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
    <LargeNavigationMenu
      menuItems={menuItems.map((menuItem: TopBarMenuItem) => ({
        link: menuItem.link,
        name: t(menuItem.key),
        isBeta: menuItem.isBeta,
      }))}
    />
  );
};

const mapMenuGroup = (menuGroup: TopBarMenuGroup): NavigationMenuSmallGroup => ({
  name: menuGroup.groupName,
  showName: menuGroup.groupName === TopBarGroup.Tools,
  items: menuGroup.menuItems.map((menuItem: TopBarMenuItem) => ({
    link: menuItem.link,
    name: menuItem.key,
    isBeta: menuItem.isBeta,
  })),
});
