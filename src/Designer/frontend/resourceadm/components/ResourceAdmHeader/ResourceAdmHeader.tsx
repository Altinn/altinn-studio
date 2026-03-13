import React, { type ReactNode } from 'react';
import classes from './ResourceAdmHeader.module.css';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { type StudioProfileMenuGroup, type StudioProfileMenuItem } from '@studio/components';
import { getOrgNameByUsername } from '../../utils/userUtils';
import { type Organization } from 'app-shared/types/Organization';
import { useLogoutMutation } from 'app-shared/hooks/mutations/useLogoutMutation';
import type { User } from 'app-shared/types/Repository';
import { useUrlParams } from '../../hooks/useUrlParams';
import { getAppName } from '../../utils/stringUtils';
import { GiteaHeader } from 'app-shared/components/GiteaHeader';
import { PageLayout } from 'app-shared/layout';

interface ResourceAdmHeaderProps {
  organizations: Organization[];
  user: User;
  children?: ReactNode;
}

export const ResourceAdmHeader = ({ organizations, user, children }: ResourceAdmHeaderProps) => {
  const { t } = useTranslation();
  const { org, app, resourceId } = useUrlParams();
  const { mutate: logout } = useLogoutMutation();
  const navigate = useNavigate();

  const resourcePath = resourceId ? ` / ${resourceId}` : '';
  const pageHeaderTitle: string = `${getOrgNameByUsername(org, organizations)}${resourcePath}`;

  const triggerButtonText = t('shared.header_user_for_org', {
    user: user?.full_name || user?.login,
    org: getOrgNameByUsername(org, organizations),
  });

  const repoPath = `/repos/${org}/${app}`;

  const handleSetSelectedContext = (context: string) => {
    navigate(`/${context}/${getAppName(context)}${location.search}`);
  };

  const selectableOrgMenuItems: StudioProfileMenuItem[] = organizations.map(
    (selectableOrg: Organization) => ({
      action: {
        type: 'button' as const,
        onClick: () => handleSetSelectedContext(selectableOrg.username),
      },
      itemName: selectableOrg?.full_name || selectableOrg.username,
      isActive: org === selectableOrg.username,
    }),
  );

  const profileMenuGroups: StudioProfileMenuGroup[] = [
    { items: selectableOrgMenuItems },
    {
      items: [
        {
          action: { type: 'link' as const, href: repoPath },
          itemName: t('shared.header_go_to_gitea'),
        },
        {
          action: { type: 'button' as const, onClick: logout },
          itemName: t('shared.header_logout'),
        },
      ],
    },
  ];

  const subContent = (
    <GiteaHeader
      menuOnlyHasRepository
      rightContentClassName={classes.extraPadding}
      owner={org}
      repoName={app}
    />
  );

  return (
    <PageLayout
      user={user}
      title={pageHeaderTitle}
      subContent={subContent}
      profileMenuGroups={profileMenuGroups}
      triggerButtonText={triggerButtonText}
    >
      {children}
    </PageLayout>
  );
};
