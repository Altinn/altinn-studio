import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioAvatar, StudioPageHeader } from '@studio/components';
import type { StudioProfileMenuGroup } from '@studio/components';
import { useLogoutMutation } from 'app-shared/hooks/mutations/useLogoutMutation';
import { useOrganizationsQuery, useUserQuery } from 'app-shared/hooks/queries';
import type { Organization } from 'app-shared/types/Organization';
import { repositoryOwnerPath } from 'app-shared/api/paths';
import { useEnvironmentConfig } from 'app-shared/contexts/EnvironmentConfigContext';
import { SETTINGS_BASENAME } from 'app-shared/constants';
import type { User } from 'app-shared/types/Repository';

export type ProfileMenuProps = {
  currentUserOrg: string | undefined;
  onOrgSelect: (org: Organization) => void;
  onUserSelect: (user: User) => void;
};

export const ProfileMenu = ({
  currentUserOrg,
  onOrgSelect,
  onUserSelect,
}: ProfileMenuProps): ReactElement | null => {
  const { t } = useTranslation();
  const { data: user } = useUserQuery();
  const { data: organizations } = useOrganizationsQuery();
  const { mutate: logout } = useLogoutMutation();
  const { environment } = useEnvironmentConfig();
  const studioOidc = environment?.featureFlags?.studioOidc;

  if (!user) {
    return null;
  }

  const isOrgContext = currentUserOrg !== undefined && currentUserOrg !== user.login;
  const org = isOrgContext ? currentUserOrg : undefined;
  const owner = org ?? user.login;
  const username = user.full_name || user.login;

  const orgMenuItems =
    organizations?.map((organization) => ({
      action: { type: 'button' as const, onClick: () => onOrgSelect(organization) },
      itemName: organization.full_name || organization.username,
      isActive: organization.username === org,
    })) ?? [];

  const activeOrg = orgMenuItems.find((item) => item.isActive);
  const triggerButtonText = activeOrg
    ? t('shared.header_user_for_org', {
        user: username,
        org: activeOrg.itemName,
      })
    : username;

  const userMenuItem = {
    action: { type: 'button' as const, onClick: () => onUserSelect(user) },
    itemName: username,
    isActive: !org,
  };

  const settingsMenuItem = owner
    ? {
        action: {
          type: 'link' as const,
          href: `${SETTINGS_BASENAME}/${owner}`,
          openInNewTab: false,
        },
        itemName: t('settings'),
      }
    : null;

  const giteaMenuItem = owner
    ? {
        action: {
          type: 'link' as const,
          href: repositoryOwnerPath(owner),
          openInNewTab: true,
        },
        itemName: t('shared.header_go_to_gitea'),
      }
    : null;

  const logOutMenuItem = {
    action: { type: 'button' as const, onClick: logout },
    itemName: t('shared.header_logout'),
  };

  const profileMenuGroups: StudioProfileMenuGroup[] = [
    { items: [...orgMenuItems, userMenuItem] },
    ...(studioOidc && settingsMenuItem ? [{ items: [settingsMenuItem] }] : []),
    ...(giteaMenuItem ? [{ items: [giteaMenuItem] }] : []),
    { items: [logOutMenuItem] },
  ];

  return (
    <StudioPageHeader.ProfileMenu
      triggerButtonText={triggerButtonText}
      profileImage={
        <StudioAvatar
          src={user.avatar_url}
          alt={t('general.profile_icon')}
          title={t('shared.header_profile_icon_text')}
        />
      }
      profileMenuGroups={profileMenuGroups}
    />
  );
};
