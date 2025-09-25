import React, { type ReactElement } from 'react';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { StudioPageHeader, useMediaQuery } from '@studio/components-legacy';
import { StudioAvatar } from '@studio/components';
import { useRepoMetadataQuery } from 'app-shared/hooks/queries';
import { SubHeader } from './SubHeader';
import { MEDIA_QUERY_MAX_WIDTH } from 'app-shared/constants';
import { SmallHeaderMenu } from './SmallHeaderMenu';
import { type HeaderMenuItem } from 'app-development/types/HeaderMenu/HeaderMenuItem';
import { useTranslation } from 'react-i18next';
import { LargeNavigationMenu } from './LargeNavigationMenu';
import { usePageHeaderContext } from 'app-development/contexts/PageHeaderContext';
import { useUserNameAndOrg } from 'app-shared/hooks/useUserNameAndOrg';

export type PageHeaderProps = {
  showSubMenu: boolean;
  isRepoError?: boolean;
};

export const PageHeader = ({ showSubMenu, isRepoError }: PageHeaderProps): ReactElement => {
  const { app } = useStudioEnvironmentParams();

  const shouldDisplayDesktopMenu = !useMediaQuery(MEDIA_QUERY_MAX_WIDTH);

  return (
    <div data-color-scheme='dark'>
      <StudioPageHeader>
        <StudioPageHeader.Main>
          <StudioPageHeader.Left showTitle={shouldDisplayDesktopMenu} title={app} />
          {shouldDisplayDesktopMenu && <CenterContent />}
          <StudioPageHeader.Right>
            <RightContent />
          </StudioPageHeader.Right>
        </StudioPageHeader.Main>
        {showSubMenu && !isRepoError && (
          <StudioPageHeader.Sub>
            <SubHeader hasRepoError={isRepoError} />
          </StudioPageHeader.Sub>
        )}
      </StudioPageHeader>
    </div>
  );
};

const CenterContent = (): ReactElement => {
  const { t } = useTranslation();
  const { menuItems } = usePageHeaderContext();

  return (
    <StudioPageHeader.Center>
      {menuItems && (
        <LargeNavigationMenu
          menuItems={menuItems.map((menuItem: HeaderMenuItem) => ({
            link: menuItem.link,
            name: t(menuItem.key),
            isBeta: menuItem.isBeta,
          }))}
        />
      )}
    </StudioPageHeader.Center>
  );
};

const RightContent = (): ReactElement => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: repository } = useRepoMetadataQuery(org, app);
  const { t } = useTranslation();
  const { user, profileMenuGroups, variant } = usePageHeaderContext();

  const isSmallScreen = useMediaQuery(MEDIA_QUERY_MAX_WIDTH);
  const userNameAndOrg = useUserNameAndOrg(user, org, repository);

  if (isSmallScreen) {
    return <SmallHeaderMenu />;
  }
  return (
    <StudioPageHeader.ProfileMenu
      triggerButtonText={userNameAndOrg}
      ariaLabelTriggerButton={userNameAndOrg}
      profileImage={
        <StudioAvatar
          src={user?.avatar_url}
          alt={t('general.profile_icon')}
          title={t('shared.header_profile_icon_text')}
        />
      }
      profileMenuGroups={profileMenuGroups}
      color='dark'
      variant={variant}
    />
  );
};
