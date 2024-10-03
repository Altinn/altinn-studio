import React, { useState, type ReactElement } from 'react';
import classes from './SmallHeaderMenu.module.css';
import { useTranslation } from 'react-i18next';
import {
  StudioAvatar,
  StudioButton,
  StudioParagraph,
  type StudioProfileMenuItem,
} from '@studio/components';
import { DropdownMenu } from '@digdir/designsystemet-react';
import { type NavigationMenuSmallItem } from 'app-development/types/HeaderMenu/NavigationMenuSmallItem';
import { type NavigationMenuSmallGroup } from 'app-development/types/HeaderMenu/NavigationMenuSmallGroup';
import { MenuHamburgerIcon } from '@studio/icons';
import { SmallHeaderMenuItem } from './SmallHeaderMenuItem';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useRepoMetadataQuery } from 'app-shared/hooks/queries';
import { usePageHeaderContext } from 'app-development/contexts/PageHeaderContext';
import { useUserNameAndOrg } from 'app-shared/components/AltinnHeaderProfile/hooks/useUserNameAndOrg';
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

  const [open, setOpen] = useState<boolean>(false);

  const toggleMenu = () => {
    setOpen((isOpen) => !isOpen);
  };

  const close = () => {
    setOpen(false);
  };

  return (
    <DropdownMenu onClose={close} open={open}>
      <DropdownMenu.Trigger asChild>
        <StudioButton
          aria-expanded={open}
          aria-haspopup='menu'
          onClick={toggleMenu}
          icon={<MenuHamburgerIcon />}
          variant='tertiary'
          color='inverted'
        >
          {t('top_menu.menu')}
        </StudioButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownContentProfile profileText={userNameAndOrg} />
        <DropdownMenuGroups profileText={userNameAndOrg} onClickMenuItem={close} />
      </DropdownMenu.Content>
    </DropdownMenu>
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
        src={user?.avatar_url ? user.avatar_url : undefined}
        alt={t('general.profile_icon')}
        title={t('shared.header_profile_icon_text')}
      />
      <StudioParagraph size='md' className={classes.profileText}>
        {profileText}
      </StudioParagraph>
    </div>
  );
};

type DropdownMenuGroupsProps = {
  profileText: string;
  onClickMenuItem: () => void;
};
const DropdownMenuGroups = ({
  profileText,
  onClickMenuItem,
}: DropdownMenuGroupsProps): ReactElement[] => {
  const { t } = useTranslation();
  const { menuItems, profileMenuItems } = usePageHeaderContext();

  const menuGroupHeader = (menuGroup: NavigationMenuSmallGroup): string =>
    menuGroup.showName ? t(menuGroup.name) : '';

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

  return menuGroups.map((menuGroup: NavigationMenuSmallGroup, index: number) => (
    <DropdownMenu.Group
      heading={menuGroupHeader(menuGroup)}
      className={classes.dropDownMenuGroup}
      key={menuGroup.name}
    >
      {menuGroup.items.map((menuItem: NavigationMenuSmallItem) => (
        <SmallHeaderMenuItem key={menuItem.name} menuItem={menuItem} onClick={onClickMenuItem} />
      ))}
    </DropdownMenu.Group>
  ));
};
