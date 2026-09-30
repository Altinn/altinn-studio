import type { ReactElement } from 'react';
import { Fragment } from 'react';
import classes from './SmallHeaderMenu.module.css';
import { useTranslation } from 'react-i18next';
import { type StudioProfileMenuItem } from '@studio/components';
import { StudioDropdown, StudioParagraph, StudioAvatar } from '@studio/components';
import { type NavigationMenuSmallItem } from 'app-development/types/HeaderMenu/NavigationMenuSmallItem';
import { type NavigationMenuSmallGroup } from 'app-development/types/HeaderMenu/NavigationMenuSmallGroup';
import { MenuHamburgerIcon } from '@studio/icons';
import { SmallHeaderMenuItem } from './SmallHeaderMenuItem';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useRepoMetadataQuery } from 'app-shared/hooks/queries';
import { usePageHeaderContext } from 'app-development/contexts/PageHeaderContext';
import { useUserNameAndOrg } from 'app-shared/hooks/useUserNameAndOrg';
import { type HeaderMenuGroup } from 'app-development/types/HeaderMenu/HeaderMenuGroup';
import {
  groupMenuItemsByGroup,
  mapHeaderMenuGroupToNavigationMenu,
} from 'app-development/utils/headerMenu/headerMenuUtils';

export const SmallHeaderMenu = (): ReactElement => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: repository } = useRepoMetadataQuery(org, app);
  const { user } = usePageHeaderContext();

  const userNameAndOrg = useUserNameAndOrg(user, org, repository);

  return (
    <StudioDropdown
      icon={<MenuHamburgerIcon />}
      triggerButtonText={t('top_menu.menu')}
      triggerButtonVariant='tertiary'
      data-color='neutral'
      data-color-scheme='light'
    >
      <DropdownContentProfile profileText={userNameAndOrg} />
      <DropdownMenuGroups profileText={userNameAndOrg} />
    </StudioDropdown>
  );
};

type DropdownContentProfileProps = {
  profileText: string;
};
const DropdownContentProfile = ({ profileText }: DropdownContentProfileProps): ReactElement => {
  const { t } = useTranslation();
  const { user } = usePageHeaderContext();

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
  profileText: string;
};
const DropdownMenuGroups = ({ profileText }: DropdownMenuGroupsProps): ReactElement[] => {
  const { t } = useTranslation();
  const { menuItems, profileMenuItems } = usePageHeaderContext();

  const groupedMenuItems: HeaderMenuGroup[] = groupMenuItemsByGroup(menuItems);

  const profileMenuGroup: NavigationMenuSmallGroup = {
    name: profileText,
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

  return menuGroups.map((menuGroup: NavigationMenuSmallGroup) => (
    <Fragment key={menuGroup.name}>
      {menuGroup.showName && <StudioDropdown.Heading>{t(menuGroup.name)}</StudioDropdown.Heading>}
      <StudioDropdown.List className={classes.dropDownMenuGroup}>
        {menuGroup.items.map((menuItem: NavigationMenuSmallItem) => (
          <SmallHeaderMenuItem key={menuItem.name} menuItem={menuItem} />
        ))}
      </StudioDropdown.List>
    </Fragment>
  ));
};
