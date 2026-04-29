import type { ReactElement } from 'react';
import { StudioPageHeader } from '@studio/components';
import { useMediaQuery } from '@studio/hooks';
import {
  DASHBOARD_BASENAME,
  APP_DASHBOARD_BASENAME,
  ORG_LIBRARY_BASENAME,
  DISPLAY_NAME,
  MEDIA_QUERY_MAX_WIDTH,
  ADMIN_BASENAME,
} from 'app-shared/constants';
import type { Organization } from 'app-shared/types/Organization';
import type { User } from 'app-shared/types/Repository';
import { NavigationMenu } from './NavigationMenu/NavigationMenu';
import type { NavigationMenuItem } from './NavigationMenu/NavigationMenuItem';
import { FeatureFlag, useFeatureFlag } from '@studio/feature-flags';
import { ProfileMenu } from './ProfileMenu/ProfileMenu';

const isPathActive = (pathname: string, basePath: string): boolean =>
  pathname === basePath || pathname.startsWith(`${basePath}/`);

type PageHeaderProps = {
  owner: string | undefined;
  onOrgSelect: (org: Organization) => void;
  onUserSelect: (user: User) => void;
};

export const PageHeader = ({ owner, onOrgSelect, onUserSelect }: PageHeaderProps): ReactElement => {
  const shouldDisplayDesktopMenu = !useMediaQuery(MEDIA_QUERY_MAX_WIDTH);

  const adminEnabled = useFeatureFlag(FeatureFlag.Admin);
  const appDashboardBasePath = `${DASHBOARD_BASENAME}/${APP_DASHBOARD_BASENAME}`;
  const orgLibraryBasePath = `${DASHBOARD_BASENAME}/${ORG_LIBRARY_BASENAME}`;
  const { pathname } = window.location;
  const navigationMenuItems: NavigationMenuItem[] = [
    {
      href: `${appDashboardBasePath}/${owner ?? ''}`,
      textKey: 'dashboard.header_item_dashboard',
      isActive: isPathActive(pathname, appDashboardBasePath),
    },
    ...(adminEnabled
      ? [
          {
            href: `${ADMIN_BASENAME}/${owner ?? ''}`,
            textKey: 'admin.apps.title',
            isActive: isPathActive(pathname, ADMIN_BASENAME),
          },
        ]
      : []),
    {
      href: `${orgLibraryBasePath}/${owner ?? ''}`,
      textKey: 'dashboard.header_item_library',
      isActive: isPathActive(pathname, orgLibraryBasePath),
      isBeta: true,
    },
  ];

  return (
    <div data-color-scheme='dark'>
      <StudioPageHeader>
        <StudioPageHeader.Main>
          <StudioPageHeader.Left showTitle={shouldDisplayDesktopMenu} title={DISPLAY_NAME} />
          {shouldDisplayDesktopMenu && (
            <StudioPageHeader.Center>
              <NavigationMenu items={navigationMenuItems} />
            </StudioPageHeader.Center>
          )}
          <StudioPageHeader.Right>
            <ProfileMenu
              owner={owner}
              navigationMenuItems={navigationMenuItems}
              shouldDisplayDesktopMenu={shouldDisplayDesktopMenu}
              onOrgSelect={onOrgSelect}
              onUserSelect={onUserSelect}
            />
          </StudioPageHeader.Right>
        </StudioPageHeader.Main>
      </StudioPageHeader>
    </div>
  );
};
