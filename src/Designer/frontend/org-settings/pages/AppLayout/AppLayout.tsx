import React from 'react';
import type { ReactElement } from 'react';
import classes from './AppLayout.module.css';
import { Outlet } from 'react-router-dom';
import type { StudioProfileMenuItem, StudioProfileMenuGroup } from '@studio/components';
import { StudioAvatar, StudioHeading, StudioPageHeader } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { DISPLAY_NAME, ORG_SETTINGS_BASENAME } from 'app-shared/constants';
import { useUserQuery } from 'app-shared/hooks/queries/useUserQuery';
import { useLogoutMutation } from 'app-shared/hooks/mutations/useLogoutMutation';

export const AppLayout = () => {
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
        <Outlet />
      </div>
    </div>
  );
};

const RightContent = (): ReactElement => {
  const { t } = useTranslation();
  const { data: user } = useUserQuery();
  const { mutate: logout } = useLogoutMutation();

  const userSettingsMenuItem: StudioProfileMenuItem = {
    action: {
      type: 'link',
      href: ORG_SETTINGS_BASENAME,
      openInNewTab: false,
    },
    itemName: t('user.settings'),
  };
  const logOutMenuItem: StudioProfileMenuItem = {
    action: { type: 'button', onClick: logout },
    itemName: t('shared.header_logout'),
  };

  const profileMenuGroups: StudioProfileMenuGroup[] = [
    { items: [userSettingsMenuItem] },
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
