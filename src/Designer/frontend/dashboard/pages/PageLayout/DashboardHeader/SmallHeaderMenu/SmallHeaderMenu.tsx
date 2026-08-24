import { Fragment } from 'react';
import type { ReactElement } from 'react';
import classes from './SmallHeaderMenu.module.css';
import { useTranslation } from 'react-i18next';
import { StudioDropdown, StudioParagraph, StudioAvatar } from '@studio/components';
import { MenuHamburgerIcon } from '@studio/icons';
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
import { useSelectedContext } from '../../../../hooks/useSelectedContext';

export function SmallHeaderMenu(): ReactElement {
  const { t } = useTranslation();

  return (
    <StudioDropdown
      icon={<MenuHamburgerIcon />}
      triggerButtonText={t('top_menu.menu')}
      triggerButtonVariant='tertiary'
      data-color='neutral'
      data-color-scheme='light'
    >
      <DropdownContentProfile />
      <DropdownMenuGroups />
    </StudioDropdown>
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

const DropdownMenuGroups = (): ReactElement[] => {
  const { t } = useTranslation();
  const { menuItems, profileMenuGroups } = useHeaderContext();
  const selectedContext = useSelectedContext();
  const groupedMenuItems: HeaderMenuGroup[] = groupMenuItemsByGroup(menuItems);

  const menuGroups: NavigationMenuGroup[] = [
    ...groupedMenuItems.map((menuGroup: HeaderMenuGroup) =>
      mapHeaderMenuGroupToNavigationMenu(menuGroup, selectedContext),
    ),
    ...profileMenuGroups,
  ];

  return menuGroups.map((menuGroup: NavigationMenuGroup) => (
    <Fragment key={menuGroup.items.map((item) => item.itemName).join('-')}>
      {menuGroup.showName && <StudioDropdown.Heading>{t(menuGroup.name)}</StudioDropdown.Heading>}
      <StudioDropdown.List className={classes.dropDownMenuGroup}>
        {menuGroup.items.map((menuItem: NavigationMenuItem) => (
          <SmallHeaderMenuItem key={menuItem.itemName} menuItem={menuItem} />
        ))}
      </StudioDropdown.List>
    </Fragment>
  ));
};
