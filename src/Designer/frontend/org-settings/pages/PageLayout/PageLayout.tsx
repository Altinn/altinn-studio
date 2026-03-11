import React from 'react';
import type { ReactElement } from 'react';
import classes from './PageLayout.module.css';
import { Outlet } from 'react-router-dom';
import type { StudioProfileMenuItem, StudioProfileMenuGroup } from '@studio/components';
import { StudioAvatar, StudioHeading, StudioPageHeader } from '@studio/components';
import { useTranslation } from 'react-i18next';
import './PageLayout.css';
import { Menu } from '../../components/Menu/Menu';
import { DISPLAY_NAME, ORG_SETTINGS_BASENAME } from 'app-shared/constants';
import { useUserQuery } from 'app-shared/hooks/queries/useUserQuery';
import { useLogoutMutation } from 'app-shared/hooks/mutations/useLogoutMutation';
import { typedSessionStorage } from '@studio/pure-functions';
import { repositoryBasePath, repositoryOwnerPath } from 'app-shared/api/paths';

export const PageLayout = () => {
  const { t } = useTranslation();

  return (
    <div className={classes.container}>
      <div data-color-scheme='dark'>
        <StudioPageHeader>
          <StudioPageHeader.Main>
            <StudioPageHeader.Left title={DISPLAY_NAME} showTitle={true} />
            <StudioPageHeader.Right>
              <RightContent />
            </StudioPageHeader.Right>
          </StudioPageHeader.Main>
        </StudioPageHeader>
      </div>
      <div className={classes.content}>
        <StudioHeading level={2} className={classes.settingsHeading}>
          {t('org.settings')}
        </StudioHeading>
        <div className={classes.pageContentWrapper}>
          <div className={classes.leftNavWrapper}>
            <Menu />
          </div>
          <div className={classes.contentWrapper}>
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

const NON_ORG_CONTEXTS = ['all', 'self', 'none'];

const useGiteaPath = (userLogin: string | undefined): string => {
  const selectedContext = typedSessionStorage.getItem<string>('dashboard::selectedContext');
  const isOrgContext = selectedContext && !NON_ORG_CONTEXTS.includes(selectedContext);
  const owner = isOrgContext ? selectedContext : userLogin;
  return owner ? repositoryOwnerPath(owner) : repositoryBasePath();
};

const RightContent = (): ReactElement => {
  const { t } = useTranslation();
  const { data: user } = useUserQuery();
  const { mutate: logout } = useLogoutMutation();
  const giteaPath = useGiteaPath(user?.login);

  const settingsMenuItem: StudioProfileMenuItem = {
    action: {
      type: 'link',
      href: ORG_SETTINGS_BASENAME,
      openInNewTab: false,
    },
    itemName: t('org.settings'),
  };
  const giteaMenuItem: StudioProfileMenuItem = {
    action: { type: 'link', href: giteaPath, openInNewTab: true },
    itemName: t('shared.header_go_to_gitea'),
  };
  const logOutMenuItem: StudioProfileMenuItem = {
    action: { type: 'button', onClick: logout },
    itemName: t('shared.header_logout'),
  };

  const profileMenuGroups: StudioProfileMenuGroup[] = [
    { items: [settingsMenuItem] },
    { items: [giteaMenuItem] },
    { items: [logOutMenuItem] },
  ];
  return (
    <StudioPageHeader.ProfileMenu
      triggerButtonText={user?.full_name || user?.login}
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
