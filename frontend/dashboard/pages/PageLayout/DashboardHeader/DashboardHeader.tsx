import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  StudioAvatar,
  StudioPageHeader,
  StudioProfileMenu,
  type StudioProfileMenuGroup,
  useMediaQuery,
  type StudioProfileMenuItem,
} from '@studio/components';
import { useSelectedContext } from 'dashboard/hooks/useSelectedContext';
import { type Organization } from 'app-shared/types/Organization';
import { MEDIA_QUERY_MAX_WIDTH } from 'app-shared/constants';
import { HeaderContext, SelectedContextType } from 'dashboard/context/HeaderContext';
import { useLogoutMutation } from 'app-shared/hooks/mutations/useLogoutMutation';
import { useProfileMenuTriggerButtonText } from 'dashboard/hooks/useProfileMenuTriggerButtonText';
import { useRepoPath } from 'dashboard/hooks/useRepoPath';
import { usePageHeaderTitle } from 'dashboard/hooks/usePageHeaderTitle';

const MAX_LENGTH_APP_USERNAME_BEFORE_TRUNCATE = 30;

export const DashboardHeader = () => {
  const pageHeaderTitle: string = usePageHeaderTitle();

  return (
    <StudioPageHeader>
      <StudioPageHeader.Main>
        <StudioPageHeader.Left title={pageHeaderTitle} showTitle />
        <StudioPageHeader.Right>
          <DashboardHeaderMenu />
        </StudioPageHeader.Right>
      </StudioPageHeader.Main>
    </StudioPageHeader>
  );
};

const DashboardHeaderMenu = () => {
  const { t } = useTranslation();
  const showButtonText = !useMediaQuery(MEDIA_QUERY_MAX_WIDTH);
  const selectedContext = useSelectedContext();
  const { mutate: logout } = useLogoutMutation();
  const { user, selectableOrgs } = useContext(HeaderContext);
  const navigate = useNavigate();

  const triggerButtonText = useProfileMenuTriggerButtonText();
  const repoPath = useRepoPath();

  const handleSetSelectedContext = (context: string | SelectedContextType) => {
    navigate('/' + context + location.search);
  };

  const allMenuItem: StudioProfileMenuItem = {
    action: { type: 'button', onClick: () => handleSetSelectedContext(SelectedContextType.All) },
    itemName: t('shared.header_all'),
    isActive: selectedContext === SelectedContextType.All,
  };

  const selectableOrgMenuItems: StudioProfileMenuItem[] =
    selectableOrgs?.map((selectableOrg: Organization) => ({
      action: { type: 'button', onClick: () => handleSetSelectedContext(selectableOrg.username) },
      itemName: selectableOrg?.full_name || selectableOrg.username,
      isActive: selectedContext === selectableOrg.username,
    })) ?? [];

  const selfMenuItem: StudioProfileMenuItem = {
    action: { type: 'button', onClick: () => handleSetSelectedContext(SelectedContextType.Self) },
    itemName: user?.full_name || user?.login,
    isActive: selectedContext === SelectedContextType.Self,
  };

  const giteaMenuItem: StudioProfileMenuItem = {
    action: { type: 'link', href: repoPath },
    itemName: t('shared.header_go_to_gitea'),
  };

  const logOutMenuItem: StudioProfileMenuItem = {
    action: { type: 'button', onClick: logout },
    itemName: t('shared.header_logout'),
  };

  const profileMenuGroups: StudioProfileMenuGroup[] = [
    { items: [allMenuItem, ...selectableOrgMenuItems, selfMenuItem] },
    { items: [giteaMenuItem, logOutMenuItem] },
  ];

  return (
    <StudioProfileMenu
      triggerButtonText={showButtonText && triggerButtonText}
      ariaLabelTriggerButton={triggerButtonText}
      color='dark'
      variant='regular'
      profileImage={
        <StudioAvatar
          src={user?.avatar_url ? user.avatar_url : undefined}
          alt={t('general.profile_icon')}
          title={t('shared.header_profile_icon_text')}
        />
      }
      profileMenuGroups={profileMenuGroups}
      truncateAt={MAX_LENGTH_APP_USERNAME_BEFORE_TRUNCATE}
    />
  );
};
