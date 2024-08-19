import React, { useContext } from 'react';
import {
  HeaderContext,
  getOrgNameByUsername,
  getOrgUsernameByUsername,
} from 'app-shared/navigation/main-header/Header';
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
import {
  repositoryBasePath,
  repositoryOwnerPath,
  userLogoutAfterPath,
  userLogoutPath,
} from 'app-shared/api/paths';
import { post } from 'app-shared/utils/networking';
import { SelectedContextType } from 'app-shared/enums/SelectedContextType';
import { WINDOW_RESIZE_WIDTH } from 'app-shared/utils/resizeUtils';

export const DashboardHeader = () => {
  const selectedContext = useSelectedContext();
  const { selectableOrgs } = useContext(HeaderContext);

  const pageHeaderTitle: string =
    selectedContext !== SelectedContextType.All &&
    selectedContext !== SelectedContextType.Self &&
    getOrgNameByUsername(selectedContext, selectableOrgs);

  return (
    <StudioPageHeader>
      <StudioPageHeader.Main>
        <StudioPageHeader.Left title={pageHeaderTitle} />
        <StudioPageHeader.Right>
          <HeaderMenuTODOMoveAndRename />
        </StudioPageHeader.Right>
      </StudioPageHeader.Main>
    </StudioPageHeader>
  );
};

// TODO MOVE
// TODO - Use AppUserProfileMenu?
const HeaderMenuTODOMoveAndRename = () => {
  const { t } = useTranslation();
  const shouldResizeWindow = useMediaQuery(`(max-width: ${WINDOW_RESIZE_WIDTH}px)`);

  const selectedContext = useSelectedContext();
  console.log('SELECTED CONTEXT', selectedContext);

  const { user, selectableOrgs } = useContext(HeaderContext);
  const navigate = useNavigate();

  const getTriggerButtonText = (): string => {
    if (shouldResizeWindow) return;

    // TODO - Can user full_name or login be undefined? Type says it is always set
    const username = user?.full_name || user?.login;
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
  };

  const selectableOrgMenuItems: StudioProfileMenuItem[] =
    selectableOrgs?.map((selectableOrg: Organization) => ({
      action: { type: 'button', onClick: () => handleSetSelectedContext(selectableOrg.username) },
      itemName: selectableOrg?.full_name || selectableOrg.username,
    })) ?? [];

  const selfMenuItem: StudioProfileMenuItem = {
    action: { type: 'button', onClick: () => handleSetSelectedContext(SelectedContextType.Self) },
    itemName: user?.full_name || user?.login,
    hasDivider: true,
  };

  const giteaMenuItem: StudioProfileMenuItem = {
    action: { type: 'link', href: getRepoPath() },
    itemName: t('shared.header_go_to_gitea'),
  };

  const handleLogout = () => {
    // TODO - Can we refactor this to a shared function???
    post(userLogoutPath())
      .then(() => window.location.assign(userLogoutAfterPath()))
      .finally(() => true);
  };

  const logOutMenuItem: StudioProfileMenuItem = {
    action: { type: 'button', onClick: handleLogout },
    itemName: t('shared.header_logout'),
  };

  return (
    <StudioProfileMenu
      triggerButtonText={getTriggerButtonText()}
      color='dark'
      profileImage={
        <StudioAvatar
          imageDetails={
            user?.avatar_url && {
              src: user.avatar_url,
              alt: t('general.profile_icon'),
              title: t('shared.header_profile_icon_text'),
            }
          }
        />
      }
      // TODO - Selected?? Should we have a prop for selected to show which "page" on dashboard we are on?
      profileMenuItems={[
        allMenuItem,
        ...selectableOrgMenuItems,
        selfMenuItem,
        giteaMenuItem,
        logOutMenuItem,
      ]}
    />
  );
};
