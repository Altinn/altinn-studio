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
import { useParams } from 'react-router-dom';

export type OrgOption = {
  username: string;
  displayName: string;
  isActive: boolean;
  onClick: () => void;
};

export type StudioProfileMenuComponentProps = {
  onOrgClick: (org: Organization) => void;
  onUserClick: () => void;
};

export const StudioProfileMenuComponent = ({
  onOrgClick,
  onUserClick,
}: StudioProfileMenuComponentProps): ReactElement => {
  const { t } = useTranslation();
  const { data: user } = useUserQuery();
  const { data: organizations } = useOrganizationsQuery();
  const { mutate: logout } = useLogoutMutation();
  const { org } = useParams();
  const { environment } = useEnvironmentConfig();
  const studioOidc = environment?.featureFlags?.studioOidc;
  var username = user?.full_name || user?.login;

  const organizationsOptions: OrgOption[] =
    organizations?.map((organization) => ({
      username: organization.username,
      displayName: organization.full_name || organization.username,
      isActive: organization.username === org,
      onClick: () => onOrgClick(organization),
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
    action: { type: 'button' as const, onClick: onUserClick },
    itemName: username,
    isActive: !org,
  };

  const settingsMenuItem = {
    action: {
      type: 'link' as const,
      href: org ? `${SETTINGS_BASENAME}/orgs/${org}` : `${SETTINGS_BASENAME}/user`,
      openInNewTab: false,
    },
    itemName: t('settings'),
  };

  const giteaMenuItem = {
    action: {
      type: 'link' as const,
      href: repositoryOwnerPath(org ?? user?.login ?? ''),
      openInNewTab: true,
    },
    itemName: t('shared.header_go_to_gitea'),
  };

  const logOutMenuItem = {
    action: { type: 'button' as const, onClick: logout },
    itemName: t('shared.header_logout'),
  };

  const profileMenuGroups: StudioProfileMenuGroup[] = [
    { items: [...orgMenuItems, userMenuItem] },
    { items: studioOidc ? [settingsMenuItem] : [] },
    { items: [giteaMenuItem] },
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
