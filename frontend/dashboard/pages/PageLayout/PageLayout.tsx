import {
  HeaderContext,
  getOrgNameByUsername,
  getOrgUsernameByUsername,
} from 'app-shared/navigation/main-header/Header';
import { Outlet, useNavigate } from 'react-router-dom';
import { useOrganizationsQuery } from 'dashboard/hooks/queries';
import { useUserQuery } from 'app-shared/hooks/queries';
import React, { useContext, useMemo } from 'react';
import type { IHeaderContext } from 'app-shared/navigation/main-header/Header';
import { useTranslation } from 'react-i18next';

import {
  StudioPageSpinner,
  StudioPageHeader,
  StudioProfileMenu,
  useIsSmallWidth,
  type StudioProfileMenuItem,
} from '@studio/components';
import { useContextRedirectionGuard } from 'dashboard/hooks/guards/useContextRedirectionGuard';
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

export const PageLayout = () => {
  const { t } = useTranslation();
  const { data: user } = useUserQuery();
  const { data: organizations } = useOrganizationsQuery();
  const { isRedirectionComplete } = useContextRedirectionGuard(organizations);

  const headerContextValue: IHeaderContext = useMemo(
    () => ({
      selectableOrgs: organizations,
      user,
    }),
    [organizations, user],
  );

  if (!isRedirectionComplete) return <StudioPageSpinner spinnerTitle={t('dashboard.loading')} />;

  return (
    <>
      <HeaderContext.Provider value={headerContextValue}>
        <DashboardHeader />
      </HeaderContext.Provider>
      <Outlet />
    </>
  );
};

const DashboardHeader = () => {
  const selectedContext = useSelectedContext();
  const { selectableOrgs } = useContext(HeaderContext);

  return (
    <StudioPageHeader>
      <StudioPageHeader.Main>
        <StudioPageHeader.Left
          variant='regular' // TOD MAKE DEFAULT
          title={
            // TODO MOVE
            selectedContext !== SelectedContextType.All &&
            selectedContext !== SelectedContextType.Self &&
            getOrgNameByUsername(selectedContext, selectableOrgs)
          }
        />
        <StudioPageHeader.Right>
          <HeaderMenuTODOMoveAndRename />
        </StudioPageHeader.Right>
      </StudioPageHeader.Main>
    </StudioPageHeader>
  );
};

const WINDOW_RESIZE_WIDTH = 900;

const HeaderMenuTODOMoveAndRename = () => {
  const { t } = useTranslation();
  const isSmallWidth = useIsSmallWidth(WINDOW_RESIZE_WIDTH);
  const selectedContext = useSelectedContext();
  console.log('SELECTED CONTEXT', selectedContext);

  const { user, selectableOrgs } = useContext(HeaderContext);
  const navigate = useNavigate();

  const getTriggerButtonText = (): string => {
    if (isSmallWidth) return;

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
  };

  const giteaMenuItem: StudioProfileMenuItem = {
    action: { type: 'link', href: getRepoPath() },
    itemName: t('shared.header_go_to_gitea'),
  };

  const handleLogout = () => {
    // TODO - OLD FUNCTIONALITY
    /*
    const altinnWindow: Window = window;
    const url = `${altinnWindow.location.origin}/repos/user/logout`;
    post(url).then(() => {
      window.location.assign(`${altinnWindow.location.origin}/Home/Logout`);
    });
    sessionStorage.clear();
    return true;
    */

    // How its done in app-development
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
      variant='regular'
      profileImage={
        user.avatar_url && (
          <img
            alt={t('general.profile_icon')}
            title={t('shared.header_profile_icon_text')}
            // className={classes.userAvatar}
            src={user.avatar_url}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '30px',
            }}
          />
        )
      }
      // TODO - Selected??
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
