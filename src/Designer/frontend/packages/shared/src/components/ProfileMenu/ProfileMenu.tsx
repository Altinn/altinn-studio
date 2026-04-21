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
import type { AxiosError } from 'axios';
import type { ApiError } from 'app-shared/types/api/ApiError';
import { ServerCodes } from 'app-shared/enums/ServerCodes';

type OrgOption = {
  username: string;
  displayName: string;
  isActive: boolean;
  onClick: () => void;
};

export type ProfileMenuProps = {
  currentUserOrg: string | undefined;
  onOrgSelect: (org: Organization) => void;
  onUserSelect: (user: User) => void;
};

export const ProfileMenu = ({
  currentUserOrg,
  onOrgSelect,
  onUserSelect,
}: ProfileMenuProps): ReactElement => {
  const { t } = useTranslation();
  const { data: user } = useUserQuery({
    hideDefaultError: (error: AxiosError<ApiError>) =>
      error.response?.status === ServerCodes.Unauthorized,
  });
  const { data: organizations } = useOrganizationsQuery({
    hideDefaultError: (error: AxiosError<ApiError>) =>
      error.response?.status === ServerCodes.Unauthorized,
  });
  const { mutate: logout } = useLogoutMutation();
  const isOrgContext = currentUserOrg !== undefined && currentUserOrg !== user?.login;
  const org = isOrgContext ? currentUserOrg : undefined;
  const owner = org ?? user?.login;
  const { environment } = useEnvironmentConfig();
  const studioOidc = environment?.featureFlags?.studioOidc;
  const username = user?.full_name || user?.login;

  if (!user) {
    return null;
  }

  const organizationsOptions: OrgOption[] =
    organizations?.map((organization) => ({
      username: organization.username,
      displayName: organization.full_name || organization.username,
      isActive: organization.username === org,
      onClick: () => onOrgSelect(organization),
    })) ?? [];

  const activeOrg = organizationsOptions.find((organizationOption) => organizationOption.isActive);
  const triggerButtonText = activeOrg
    ? t('shared.header_user_for_org', {
        user: username,
        org: activeOrg.displayName,
      })
    : username;

  const orgMenuItems = organizationsOptions.map((organizationOption) => ({
    action: { type: 'button' as const, onClick: organizationOption.onClick },
    itemName: organizationOption.displayName,
    isActive: organizationOption.isActive,
  }));

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
          src={user?.avatar_url}
          alt={t('general.profile_icon')}
          title={t('shared.header_profile_icon_text')}
        />
      }
      profileMenuGroups={profileMenuGroups}
    />
  );
};
