import React, { useState, type ReactElement } from 'react';
import classes from './SmallHeaderMenu.module.css';
import { useTranslation } from 'react-i18next';
import { StudioAvatar, StudioButton, type StudioProfileMenuItem } from '@studio/components-legacy';
import { StudioParagraph } from '@studio/components';
import { DropdownMenu } from '@digdir/designsystemet-react';
import { type NavigationMenuSmallItem } from '../../../types/HeaderMenu/NavigationMenuSmallItem';
import { type NavigationMenuSmallGroup } from '../../../types/HeaderMenu/NavigationMenuSmallGroup';
import { MenuHamburgerIcon } from 'libs/studio-icons/src';
import { SmallHeaderMenuItem } from './SmallHeaderMenuItem';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useRepoMetadataQuery } from 'app-shared/hooks/queries';
import { usePageHeaderContext } from '../../../contexts/PageHeaderContext';
import { useUserNameAndOrg } from 'app-shared/hooks/useUserNameAndOrg';
import { type HeaderMenuGroup } from '../../../types/HeaderMenu/HeaderMenuGroup';
import {
  groupMenuItemsByGroup,
  mapHeaderMenuGroupToNavigationMenu,
} from '../../../utils/headerMenu/headerMenuUtils';

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
  onClickMenuItem: () => void;
};
const DropdownMenuGroups = ({
  profileText,
  onClickMenuItem,
}: DropdownMenuGroupsProps): ReactElement[] => {
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
    <DropdownMenu.Group
      heading={menuGroup.showName && t(menuGroup.name)}
      className={classes.dropDownMenuGroup}
      key={menuGroup.name}
    >
      {menuGroup.items.map((menuItem: NavigationMenuSmallItem) => (
        <SmallHeaderMenuItem key={menuItem.name} menuItem={menuItem} onClick={onClickMenuItem} />
      ))}
    </DropdownMenu.Group>
  ));
};
