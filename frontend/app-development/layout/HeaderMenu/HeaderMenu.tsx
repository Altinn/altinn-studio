import React, { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { MenuHamburgerIcon } from '@studio/icons';
import { groupMenuItemsByGroup } from 'app-development/utils/headerMenu/headerMenuUtils';
import { LargeNavigationMenu } from './LargeNavigationMenu';
import { type NavigationMenuSmallGroup } from 'app-development/types/HeaderMenu/NavigationMenuSmallGroup';
import { SmallNavigationMenu } from './SmallNavigationMenu';
import { type HeaderMenuItem } from 'app-development/types/HeaderMenu/HeaderMenuItem';
import { type HeaderMenuGroup } from 'app-development/types/HeaderMenu/HeaderMenuGroup';
import { HeaderMenuGroupKey } from 'app-development/enums/HeaderMenuGroupKey';

export type HeaderMenuProps = {
  menuItems: HeaderMenuItem[];
  shouldResize: boolean;
};

export const HeaderMenu = ({ menuItems, shouldResize }: HeaderMenuProps): ReactElement => {
  const { t } = useTranslation();

  const groupedMenuItems: HeaderMenuGroup[] = groupMenuItemsByGroup(menuItems);

  if (!menuItems.length) return null;

  if (shouldResize) {
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
      menuItems={menuItems.map((menuItem: HeaderMenuItem) => ({
        link: menuItem.link,
        name: t(menuItem.key),
        isBeta: menuItem.isBeta,
      }))}
    />
  );
};

const mapMenuGroup = (menuGroup: HeaderMenuGroup): NavigationMenuSmallGroup => ({
  name: menuGroup.groupName,
  showName: menuGroup.groupName === HeaderMenuGroupKey.Tools,
  items: menuGroup.menuItems.map((menuItem: HeaderMenuItem) => ({
    link: menuItem.link,
    name: menuItem.key,
    isBeta: menuItem.isBeta,
  })),
});
