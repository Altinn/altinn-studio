import React, { type ReactElement } from 'react';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { StudioPageHeader, useMediaQuery } from '@studio/components';
import { useRepoMetadataQuery } from 'app-shared/hooks/queries';
import { AppUserProfileMenu } from 'app-shared/components/AppUserProfileMenu';
import { SubHeader } from './SubHeader';
import { MEDIA_QUERY_MAX_WIDTH } from 'app-shared/constants';
import { SmallHeaderMenu } from './SmallHeaderMenu';
import { type HeaderMenuItem } from 'app-development/types/HeaderMenu/HeaderMenuItem';
import { useTranslation } from 'react-i18next';
import { LargeNavigationMenu } from './LargeNavigationMenu';
import { usePageHeaderContext } from 'app-development/contexts/PageHeaderContext';

export type PageHeaderProps = {
  showSubMenu: boolean;
  isRepoError?: boolean;
};

export const PageHeader = ({ showSubMenu, isRepoError }: PageHeaderProps): ReactElement => {
  const { t } = useTranslation();
  const { app } = useStudioEnvironmentParams();
  const { menuItems } = usePageHeaderContext();

  const shouldDisplaySmallMenu = useMediaQuery(MEDIA_QUERY_MAX_WIDTH);
  const shouldDisplayText = !shouldDisplaySmallMenu;

  return (
    <StudioPageHeader>
      <StudioPageHeader.Main>
        <StudioPageHeader.Left showTitle={shouldDisplayText} title={app} />
        {!shouldDisplaySmallMenu && (
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
        )}
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
  );
};

const RightContent = (): ReactElement => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: repository } = useRepoMetadataQuery(org, app);
  const isSmallScreen = useMediaQuery(MEDIA_QUERY_MAX_WIDTH);
  const { user, profileMenuItems, variant } = usePageHeaderContext();

  if (isSmallScreen) {
    return <SmallHeaderMenu />;
  }
  return (
    <AppUserProfileMenu
      repository={repository}
      color='dark'
      variant={variant}
      user={user}
      profileMenuItems={profileMenuItems}
    />
  );
};
