import React from 'react';
import classes from './ResourceAdmHeader.module.css';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  StudioPageHeader,
  type StudioProfileMenuGroup,
  type StudioProfileMenuItem,
} from '@studio/components';
import { useMediaQuery } from '@studio/hooks';
import { StudioAvatar } from '@studio/components';
import { getOrgNameByUsername } from '../../utils/userUtils';
import { type Organization } from 'app-shared/types/Organization';
import { MEDIA_QUERY_MAX_WIDTH } from 'app-shared/constants';
import { useLogoutMutation } from 'app-shared/hooks/mutations/useLogoutMutation';
import type { User } from 'app-shared/types/Repository';
import { useUrlParams } from '../../hooks/useUrlParams';
import { getAppName } from '../../utils/stringUtils';
import { GiteaHeader } from 'app-shared/components/GiteaHeader';

interface ResourceAdmHeaderProps {
  organizations: Organization[];
  user: User;
}

export const ResourceAdmHeader = ({ organizations, user }: ResourceAdmHeaderProps) => {
  const { org, app, resourceId } = useUrlParams();

  const resourcePath = resourceId ? ` / ${resourceId}` : '';
  const pageHeaderTitle: string = `${getOrgNameByUsername(org, organizations)}${resourcePath}`;

  return (
    <StudioPageHeader>
      <StudioPageHeader.Main>
        <StudioPageHeader.Left title={pageHeaderTitle} showTitle />
        <StudioPageHeader.Right>
          <DashboardHeaderMenu organizations={organizations} user={user} />
        </StudioPageHeader.Right>
      </StudioPageHeader.Main>
      <StudioPageHeader.Sub>
        <GiteaHeader
          menuOnlyHasRepository
          rightContentClassName={classes.extraPadding}
          owner={org}
          repoName={app}
        />
      </StudioPageHeader.Sub>
    </StudioPageHeader>
  );
};

const DashboardHeaderMenu = ({ organizations, user }: ResourceAdmHeaderProps) => {
  const { t } = useTranslation();
  const showButtonText = !useMediaQuery(MEDIA_QUERY_MAX_WIDTH);
  const { org, app } = useUrlParams();
  const { mutate: logout } = useLogoutMutation();
  const navigate = useNavigate();
  const selectableOrgs = organizations;

  const triggerButtonText = t('shared.header_user_for_org', {
    user: user?.full_name || user?.login,
    org: getOrgNameByUsername(org, selectableOrgs),
  });
  const repoPath = `/repos/${org}/${app}`;

  const handleSetSelectedContext = (context: string) => {
    navigate(`/${context}/${getAppName(context)}${location.search}`);
  };

  const selectableOrgMenuItems: StudioProfileMenuItem[] = selectableOrgs.map(
    (selectableOrg: Organization) => ({
      action: { type: 'button', onClick: () => handleSetSelectedContext(selectableOrg.username) },
      itemName: selectableOrg?.full_name || selectableOrg.username,
      isActive: org === selectableOrg.username,
    }),
  );

  const giteaMenuItem: StudioProfileMenuItem = {
    action: { type: 'link', href: repoPath },
    itemName: t('shared.header_go_to_gitea'),
  };

  const logOutMenuItem: StudioProfileMenuItem = {
    action: { type: 'button', onClick: logout },
    itemName: t('shared.header_logout'),
  };

  const profileMenuGroups: StudioProfileMenuGroup[] = [
    { items: selectableOrgMenuItems },
    { items: [giteaMenuItem, logOutMenuItem] },
  ];

  return (
    <StudioPageHeader.ProfileMenu
      triggerButtonText={showButtonText && triggerButtonText}
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
