import React, { useState } from 'react';
import type { ReactElement } from 'react';
import classes from './SmallHeaderMenu.module.css';
import { useTranslation } from 'react-i18next';
import { StudioAvatar } from '@studio/components-legacy';
import { StudioButton, StudioParagraph } from '@studio/components';
import { MenuHamburgerIcon } from '@studio/icons';
import { DropdownMenu } from '@digdir/designsystemet-react';
import { useHeaderContext } from '../../../../context/HeaderContext';
import type { HeaderMenuGroup } from '../../../../types/HeaderMenuGroup';
import { SmallHeaderMenuItem } from './SmallHeaderMenuItem';
import type { NavigationMenuItem } from '../../../../types/NavigationMenuItem';
import type { NavigationMenuGroup } from '../../../../types/NavigationMenuGroup';
import {
  groupMenuItemsByGroup,
  mapHeaderMenuGroupToNavigationMenu,
} from '../../../../utils/headerUtils';
import { useProfileMenuTriggerButtonText } from '../../../../hooks/useProfileMenuTriggerButtonText';

export function SmallHeaderMenu(): ReactElement {
  const { t } = useTranslation();
  const [open, setOpen] = useState<boolean>(false);

  const toggleMenu = () => {
    setOpen((isOpen) => !isOpen);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <DropdownMenu onClose={handleClose} open={open}>
      <DropdownMenu.Trigger asChild>
        <StudioButton
          aria-expanded={open}
          aria-haspopup='menu'
          onClick={toggleMenu}
          icon={<MenuHamburgerIcon />}
          variant='tertiary'
          data-color='neutral'
        >
          {t('top_menu.menu')}
        </StudioButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownContentProfile />
        <DropdownMenuGroups onClickMenuItem={handleClose} />
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}

const DropdownContentProfile = (): ReactElement => {
  const { t } = useTranslation();
  const { user } = useHeaderContext();
  const profileText = useProfileMenuTriggerButtonText();

  return (
    <div className={classes.profileWrapper}>
      <StudioAvatar
        src={user?.avatar_url}
        alt={t('general.profile_icon')}
        title={t('shared.header_profile_icon_text')}
      />
      <StudioParagraph data-size='md' className={classes.profileText}>
        {profileText}
      </StudioParagraph>
    </div>
  );
};

type DropdownMenuGroupsProps = {
  onClickMenuItem: () => void;
};
const DropdownMenuGroups = ({ onClickMenuItem }: DropdownMenuGroupsProps): ReactElement[] => {
  const { t } = useTranslation();
  const { menuItems, profileMenuGroups } = useHeaderContext();
  const groupedMenuItems: HeaderMenuGroup[] = groupMenuItemsByGroup(menuItems);

  const menuGroups: NavigationMenuGroup[] = [
    ...groupedMenuItems.map(mapHeaderMenuGroupToNavigationMenu),
    ...profileMenuGroups,
  ];

  return menuGroups.map((menuGroup: NavigationMenuGroup) => (
    <DropdownMenu.Group
      heading={menuGroup.showName && t(menuGroup.name)}
      className={classes.dropDownMenuGroup}
      key={menuGroup.name}
    >
      {menuGroup.items.map((menuItem: NavigationMenuItem) => (
        <SmallHeaderMenuItem
          key={menuItem.itemName}
          menuItem={menuItem}
          onClick={onClickMenuItem}
        />
      ))}
    </DropdownMenu.Group>
  ));
};
