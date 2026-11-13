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
  PLATFORM_ADMIN_PATH,
} from 'app-shared/constants';
import type { Organization } from 'app-shared/types/Organization';
import type { User } from 'app-shared/types/Repository';
import { NavigationMenu } from './NavigationMenu/NavigationMenu';
import type { NavigationMenuItem } from './NavigationMenu/NavigationMenuItem';
import { ProfileMenu } from './ProfileMenu/ProfileMenu';
import { useUserPlatformPermissionsQuery, useUserQuery } from 'app-shared/hooks/queries';

const isPathActive = (pathname: string, basePath: string): boolean =>
  pathname === basePath || pathname.startsWith(`${basePath}/`);

type PageHeaderProps = {
  owner: string | undefined;
  onOrgSelect: (org: Organization) => void;
  onUserSelect: (user: User) => void;
};

export const PageHeader = ({ owner, onOrgSelect, onUserSelect }: PageHeaderProps): ReactElement => {
  const shouldDisplayDesktopMenu = !useMediaQuery(MEDIA_QUERY_MAX_WIDTH);
  const { data: currentUser } = useUserQuery();
  const { data: platformPermissions } = useUserPlatformPermissionsQuery();
  const ownerInPath = currentUser?.login === owner ? 'self' : (owner ?? '');

  const appDashboardBasePath = `${DASHBOARD_BASENAME}/${APP_DASHBOARD_BASENAME}`;
  const orgLibraryBasePath = `${DASHBOARD_BASENAME}/${ORG_LIBRARY_BASENAME}`;
  const platformBasePath = `${ADMIN_BASENAME}/${PLATFORM_ADMIN_PATH}`;
  const { pathname } = window.location;
  const isPlatformActive = isPathActive(pathname, platformBasePath);
  const navigationMenuItems: NavigationMenuItem[] = [
    {
      href: `${appDashboardBasePath}/${ownerInPath}`,
      textKey: 'dashboard.header_item_dashboard',
      isActive: isPathActive(pathname, appDashboardBasePath),
    },
    {
      href: `${ADMIN_BASENAME}/${owner ?? ''}`,
      textKey: 'admin.apps.title',
      isActive: isPathActive(pathname, ADMIN_BASENAME) && !isPlatformActive,
      isBeta: true,
    },
    {
      href: `${orgLibraryBasePath}/${ownerInPath}`,
      textKey: 'dashboard.header_item_library',
      isActive: isPathActive(pathname, orgLibraryBasePath),
      isBeta: true,
    },
    // The platform pages are for the Studio team only. The policy on their endpoints is the real
    // protection; this just keeps the menu item away from everyone else.
    ...(platformPermissions?.hasPlatformAccess
      ? [
          {
            href: platformBasePath,
            textKey: 'admin.platform.header_item',
            isActive: isPlatformActive,
            isBeta: true,
          },
        ]
      : []),
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
