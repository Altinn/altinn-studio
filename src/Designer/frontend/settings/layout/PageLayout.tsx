import type { ReactElement } from 'react';
import classes from './PageLayout.module.css';
import { Outlet } from 'react-router-dom';
import type { StudioProfileMenuItem, StudioProfileMenuGroup } from '@studio/components';
import { StudioAvatar, StudioPageHeader } from '@studio/components';
import { useTranslation } from 'react-i18next';
import './PageLayout.css';
import { DISPLAY_NAME, SETTINGS_BASENAME } from 'app-shared/constants';
import { useUserQuery } from 'app-shared/hooks/queries/useUserQuery';
import { useEnvironmentConfig } from 'app-shared/contexts/EnvironmentConfigContext';
import { useLogoutMutation } from 'app-shared/hooks/mutations/useLogoutMutation';

export const PageLayout = () => {
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
        <Outlet />
      </div>
    </div>
  );
};

const RightContent = (): ReactElement => {
  const { t } = useTranslation();
  const { data: user } = useUserQuery();
  const { environment } = useEnvironmentConfig();
  const { mutate: logout } = useLogoutMutation();

  const settingsMenuItem: StudioProfileMenuItem = {
    action: {
      type: 'link',
      href: SETTINGS_BASENAME,
      openInNewTab: false,
    },
    itemName: t('settings'),
  };
  const logOutMenuItem: StudioProfileMenuItem = {
    action: { type: 'button', onClick: logout },
    itemName: t('shared.header_logout'),
  };

  const studioOidc = environment?.featureFlags?.studioOidc;

  const profileMenuGroups: StudioProfileMenuGroup[] = [
    { items: studioOidc ? [settingsMenuItem] : [] },
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
