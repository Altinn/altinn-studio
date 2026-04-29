import type { ReactElement } from 'react';
import type { StudioProfileMenuGroup } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { repositoryOwnerPath } from 'app-shared/api/paths';
import { useEnvironmentConfig } from 'app-shared/contexts/EnvironmentConfigContext';
import { useLogoutMutation } from 'app-shared/hooks/mutations/useLogoutMutation';
import { useOrganizationsQuery, useUserQuery } from 'app-shared/hooks/queries';
import { SETTINGS_BASENAME } from 'app-shared/constants';
import type { Organization } from 'app-shared/types/Organization';
import type { User } from 'app-shared/types/Repository';
import type { NavigationMenuItem } from '../NavigationMenu/NavigationMenuItem';
import { LargeProfileMenu } from './LargeProfileMenu/LargeProfileMenu';
import { SmallProfileMenu } from './SmallProfileMenu/SmallProfileMenu';

type ProfileMenuProps = {
  owner: string | undefined;
  navigationMenuItems: NavigationMenuItem[];
  shouldDisplayDesktopMenu: boolean;
  onOrgSelect: (org: Organization) => void;
  onUserSelect: (user: User) => void;
};

export const ProfileMenu = ({
  owner,
  navigationMenuItems,
  shouldDisplayDesktopMenu,
  onOrgSelect,
  onUserSelect,
}: ProfileMenuProps): ReactElement => {
  const { t } = useTranslation();
  const { data: user } = useUserQuery();
  const { data: organizations } = useOrganizationsQuery();
  const { mutate: logout } = useLogoutMutation();
  const { environment } = useEnvironmentConfig();
  const studioOidc = environment?.featureFlags?.studioOidc;

  if (!owner || !user) {
    return null;
  }

  const username = user.full_name || user.login;

  const orgMenuItems =
    organizations?.map((organization) => ({
      action: { type: 'button' as const, onClick: () => onOrgSelect(organization) },
      itemName: organization.full_name || organization.username,
      isActive: organization.username === owner && owner !== user.login,
    })) ?? [];

  const activeOrg = orgMenuItems.find((item) => item.isActive);
  const profileMenuTriggerText = activeOrg
    ? t('shared.header_user_for_org', {
        user: username,
        org: activeOrg.itemName,
      })
    : username;

  const userMenuItem = {
    action: { type: 'button' as const, onClick: () => onUserSelect(user) },
    itemName: user.full_name || user.login,
    isActive: owner === user.login,
  };

  const settingsMenuItem = {
    action: {
      type: 'link' as const,
      href: `${SETTINGS_BASENAME}/${owner}`,
      openInNewTab: false,
    },
    itemName: t('settings'),
  };
  const giteaMenuItem = {
    action: {
      type: 'link' as const,
      href: repositoryOwnerPath(owner),
      openInNewTab: true,
    },
    itemName: t('shared.header_go_to_gitea'),
  };
  const logOutMenuItem = {
    action: { type: 'button' as const, onClick: logout },
    itemName: t('shared.header_logout'),
  };
  const navigationItems = navigationMenuItems.map((navigationMenuItem) => ({
    action: {
      type: 'link' as const,
      href: navigationMenuItem.href,
      openInNewTab: false,
    },
    itemName: t(navigationMenuItem.textKey),
  }));
  const items: StudioProfileMenuGroup[] = [
    ...(shouldDisplayDesktopMenu
      ? []
      : [{ name: t('top_bar.group_tools'), items: [...navigationItems] }]),
    { name: t('top_bar.group_organizations'), items: [...orgMenuItems, userMenuItem] },
    ...(studioOidc ? [{ items: [settingsMenuItem] }] : []),
    { items: [giteaMenuItem] },
    { items: [logOutMenuItem] },
  ];

  return shouldDisplayDesktopMenu ? (
    <LargeProfileMenu triggerButtonText={profileMenuTriggerText} items={items} />
  ) : (
    <SmallProfileMenu triggerButtonText={profileMenuTriggerText} items={items} />
  );
};
