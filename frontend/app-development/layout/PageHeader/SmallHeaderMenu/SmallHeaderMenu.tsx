import React, { useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioButton, type StudioProfileMenuItem } from '@studio/components';
import { Divider, DropdownMenu } from '@digdir/designsystemet-react';
import { type NavigationMenuSmallItem } from 'app-development/types/HeaderMenu/NavigationMenuSmallItem';
import { type NavigationMenuSmallGroup } from 'app-development/types/HeaderMenu/NavigationMenuSmallGroup';
import { MenuHamburgerIcon } from '@studio/icons';
import { SmallHeaderMenuItem } from './SmallHeaderMenuItem';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useRepoMetadataQuery } from 'app-shared/hooks/queries';
import { usePageHeaderContext } from 'app-development/contexts/PageHeaderContext';
import { useUserNameAndOrg } from 'app-shared/components/AppUserProfileMenu/hooks/useUserNameAndOrg';
import { type HeaderMenuGroup } from 'app-development/types/HeaderMenu/HeaderMenuGroup';
import {
  groupMenuItemsByGroup,
  mapHeaderMenuGroupToNavigationMenu,
} from 'app-development/utils/headerMenu/headerMenuUtils';

export const SmallHeaderMenu = (): ReactElement => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: repository } = useRepoMetadataQuery(org, app);
  const { user, menuItems, profileMenuItems } = usePageHeaderContext();

  const userNameAndOrg = useUserNameAndOrg(user, org, repository);

  const [open, setOpen] = useState<boolean>(false);

  const groupedMenuItems: HeaderMenuGroup[] = groupMenuItemsByGroup(menuItems);

  const profileMenuGroup: NavigationMenuSmallGroup = {
    name: userNameAndOrg,
    showName: false,
    items: profileMenuItems.map((item: StudioProfileMenuItem) => ({
      name: item.itemName,
      action: item.action,
    })),
  };

  const menuGroups: NavigationMenuSmallGroup[] = [
    ...groupedMenuItems.map(mapHeaderMenuGroupToNavigationMenu),
    profileMenuGroup,
  ];

  const handleToggleMenu = () => {
    setOpen((isOpen) => !isOpen);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const menuGroupHeader = (menuGroup: NavigationMenuSmallGroup) =>
    menuGroup.showName ? t(menuGroup.name) : '';

  // TODO - Move the Profile image to the top of this menu
  return (
    <DropdownMenu onClose={handleClose} open={open}>
      <DropdownMenu.Trigger asChild>
        <StudioButton
          aria-expanded={open}
          aria-haspopup='menu'
          onClick={handleToggleMenu}
          icon={<MenuHamburgerIcon />}
          variant='tertiary'
          color='inverted'
        >
          {t('top_menu.menu')}
        </StudioButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        {menuGroups.map((menuGroup: NavigationMenuSmallGroup, index: number) => (
          <React.Fragment key={menuGroup.name}>
            <DropdownMenu.Group heading={menuGroupHeader(menuGroup)}>
              {menuGroup.items.map((menuItem: NavigationMenuSmallItem) => (
                <SmallHeaderMenuItem
                  key={menuItem.name}
                  menuItem={menuItem}
                  onClick={handleClose}
                />
              ))}
            </DropdownMenu.Group>
            {index !== menuGroups.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu>
  );
};
