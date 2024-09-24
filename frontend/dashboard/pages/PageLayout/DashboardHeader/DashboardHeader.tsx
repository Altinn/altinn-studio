import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  StudioAvatar,
  StudioPageHeader,
  StudioProfileMenu,
  useMediaQuery,
  type StudioProfileMenuItem,
} from '@studio/components';
import { useSelectedContext } from 'dashboard/hooks/useSelectedContext';
import { type Organization } from 'app-shared/types/Organization';
import { repositoryBasePath, repositoryOwnerPath } from 'app-shared/api/paths';
import { MEDIA_QUERY_MAX_WIDTH } from 'app-shared/constants';
import { HeaderContext, SelectedContextType } from 'dashboard/context/HeaderContext';
import { useLogoutMutation } from 'app-shared/hooks/mutations/useLogoutMutation';
import { getOrgNameByUsername, getOrgUsernameByUsername } from 'dashboard/utils/userUtils';

const TRUNCATE_APP_USERNAME = 30;

export const DashboardHeader = () => {
  const selectedContext = useSelectedContext();
  const { selectableOrgs } = useContext(HeaderContext);
  const { t } = useTranslation();

  const pageHeaderTitle: string =
    selectedContext !== SelectedContextType.All && selectedContext !== SelectedContextType.Self
      ? getOrgNameByUsername(selectedContext, selectableOrgs)
      : t('general.back_to_dashboard');

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
  const shouldHideButtonText = useMediaQuery(MEDIA_QUERY_MAX_WIDTH);
  const selectedContext = useSelectedContext();
  const { mutate: logout } = useLogoutMutation();
  const { user, selectableOrgs } = useContext(HeaderContext);
  const navigate = useNavigate();

  const getTriggerButtonText = (): string => {
    if (shouldHideButtonText) return;

    const username = user.full_name || user.login;

    if (
      selectedContext !== SelectedContextType.All &&
      selectedContext !== SelectedContextType.Self
    ) {
      return t('shared.header_user_for_org', {
        user: username,
        org: getOrgNameByUsername(selectedContext, selectableOrgs),
      });
    }
    return username;
  };

  const handleSetSelectedContext = (context: string | SelectedContextType) => {
    navigate('/' + context + location.search);
  };

  const org = getOrgUsernameByUsername(selectedContext, selectableOrgs);

  const getRepoPath = () => {
    const owner = org || user?.login;
    if (owner) {
      return repositoryOwnerPath(owner);
    }
    return repositoryBasePath();
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
    hasDivider: true,
    isActive: selectedContext === SelectedContextType.Self,
  };

  const giteaMenuItem: StudioProfileMenuItem = {
    action: { type: 'link', href: getRepoPath() },
    itemName: t('shared.header_go_to_gitea'),
  };

  const logOutMenuItem: StudioProfileMenuItem = {
    action: { type: 'button', onClick: logout },
    itemName: t('shared.header_logout'),
  };

  return (
    <StudioProfileMenu
      triggerButtonText={getTriggerButtonText()}
      ariaLabelTriggerButton={getTriggerButtonText()}
      color='dark'
      variant='regular'
      profileImage={
        <StudioAvatar
          src={user?.avatar_url ? user.avatar_url : undefined}
          alt={t('general.profile_icon')}
          title={t('shared.header_profile_icon_text')}
        />
      }
      profileMenuItems={[
        allMenuItem,
        ...selectableOrgMenuItems,
        selfMenuItem,
        giteaMenuItem,
        logOutMenuItem,
      ]}
      truncateAt={TRUNCATE_APP_USERNAME}
    />
  );
};
