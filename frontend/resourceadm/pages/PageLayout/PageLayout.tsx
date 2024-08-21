import React, { useContext, useEffect, useMemo } from 'react';
import classes from './PageLayout.module.css';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  HeaderContext,
  getOrgNameByUsername,
  getOrgUsernameByUsername,
} from 'app-shared/navigation/main-header/Header';
import type { IHeaderContext } from 'app-shared/navigation/main-header/Header';
import { userHasAccessToOrganization } from '../../utils/userUtils';
import { useOrganizationsQuery } from '../../hooks/queries';
import { useUserQuery } from 'app-shared/hooks/queries';
import { GiteaHeader } from 'app-shared/components/GiteaHeader';
import { useUrlParams } from '../../hooks/useUrlParams';
import {
  StudioPageHeader,
  StudioProfileMenu,
  type StudioProfileMenuItem,
  useMediaQuery,
  StudioAvatar,
} from '@studio/components';
import {
  repositoryBasePath,
  repositoryOwnerPath,
  userLogoutAfterPath,
  userLogoutPath,
} from 'app-shared/api/paths';
import { post } from 'app-shared/utils/networking';
import { type Organization } from 'app-shared/types/Organization';
import { useTranslation } from 'react-i18next';
import { SelectedContextType } from 'app-shared/enums/SelectedContextType';
import { MEDIA_QUERY_MAX_WIDTH } from 'app-shared/constants';

/**
 * @component
 *    The layout of each page, including the header and the Gitea header
 *
 * @returns {React.JSX.Element} - The rendered component
 */
export const PageLayout = (): React.JSX.Element => {
  const { pathname } = useLocation();
  const { data: user } = useUserQuery();
  const { data: organizations } = useOrganizationsQuery();

  const { org = SelectedContextType.Self } = useUrlParams();

  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    if (organizations && !userHasAccessToOrganization({ org, orgs: organizations })) {
      navigate('/');
    }
  }, [organizations, org, user.login, navigate]);

  const headerContextValue: IHeaderContext = useMemo(
    () => ({
      selectableOrgs: organizations,
      user,
    }),
    [organizations, user],
  );

  return (
    <>
      <HeaderContext.Provider value={headerContextValue}>
        <ResourceadmHeader />
      </HeaderContext.Provider>
      <Outlet />
    </>
  );
};

const ResourceadmHeader = () => {
  const { org = SelectedContextType.Self } = useUrlParams();
  const selectedContext = org;

  const { selectableOrgs } = useContext(HeaderContext);

  return (
    <StudioPageHeader>
      <StudioPageHeader.Main>
        <StudioPageHeader.Left
          title={
            // TODO MOVE
            selectedContext !== SelectedContextType.All &&
            selectedContext !== SelectedContextType.Self &&
            getOrgNameByUsername(selectedContext, selectableOrgs)
          }
        />
        <StudioPageHeader.Right>
          <ResourceadmHeaderMenu />
        </StudioPageHeader.Right>
      </StudioPageHeader.Main>
      <StudioPageHeader.Sub>
        <GiteaHeader menuOnlyHasRepository rightContentClassName={classes.extraPadding} />
      </StudioPageHeader.Sub>
    </StudioPageHeader>
  );
};

const ResourceadmHeaderMenu = () => {
  const { t } = useTranslation();
  const shouldResizeWindow = useMediaQuery(MEDIA_QUERY_MAX_WIDTH);
  const { org: selectedContext = SelectedContextType.Self } = useUrlParams();

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
