import React from 'react';
import classes from './DashboardHeader.module.css';
import cn from 'classnames';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StudioAvatar, StudioPageHeader, useMediaQuery } from '@studio/components';
import { useSelectedContext } from '../../../hooks/useSelectedContext';
import { MEDIA_QUERY_MAX_WIDTH } from 'app-shared/constants';
import { useHeaderContext } from '../../../context/HeaderContext';
import { useProfileMenuTriggerButtonText } from '../../../hooks/useProfileMenuTriggerButtonText';
import { usePageHeaderTitle } from '../../../hooks/usePageHeaderTitle';
import type { HeaderMenuItem } from '../../../types/HeaderMenuItem';
import { dashboardHeaderMenuItems } from '../../../utils/headerUtils/headerUtils';
import { StringUtils } from '@studio/pure-functions';
import { FeatureFlag, shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';
import { SubHeader } from './SubHeader';
import { Subroute } from '../../../enums/Subroute';
import { isOrg } from '../../../pages/OrgContentLibrary/utils';

export type DashboardHeaderProps = {
  showSubMenu: boolean;
  isRepoError?: boolean;
};

export const DashboardHeader = ({ showSubMenu, isRepoError }: DashboardHeaderProps) => {
  const pageHeaderTitle: string = usePageHeaderTitle();
  const selectedContext = useSelectedContext();
  const location = useLocation();
  const currentRoutePath: string = extractSecondLastRouterParam(location.pathname);

  const isOrgLibraryPage: boolean =
    currentRoutePath === StringUtils.removeLeadingSlash(Subroute.OrgLibrary);
  const shouldShowSubMenu: boolean =
    showSubMenu &&
    !isRepoError &&
    isOrg(selectedContext) &&
    isOrgLibraryPage &&
    shouldDisplayFeature(FeatureFlag.OrgLibrary);

  return (
    <StudioPageHeader>
      <StudioPageHeader.Main>
        <StudioPageHeader.Left title={pageHeaderTitle} showTitle />
        <StudioPageHeader.Center>
          {shouldDisplayFeature(FeatureFlag.OrgLibrary) &&
            dashboardHeaderMenuItems.map((menuItem: HeaderMenuItem) => (
              <TopNavigationMenuItem key={menuItem.name} menuItem={menuItem} />
            ))}
        </StudioPageHeader.Center>
        <StudioPageHeader.Right>
          <DashboardHeaderMenu />
        </StudioPageHeader.Right>
      </StudioPageHeader.Main>
      {shouldShowSubMenu && (
        <StudioPageHeader.Sub>
          <SubHeader hasRepoError={isRepoError} />
        </StudioPageHeader.Sub>
      )}
    </StudioPageHeader>
  );
};

type TopNavigationMenuProps = {
  menuItem: HeaderMenuItem;
};

function TopNavigationMenuItem({ menuItem }: TopNavigationMenuProps): React.ReactElement {
  const selectedContext: string = useSelectedContext();
  const { t } = useTranslation();
  const location = useLocation();
  const path: string = `${menuItem.link}/${selectedContext}`;
  const currentRoutePath: string = extractSecondLastRouterParam(location.pathname);

  return (
    <StudioPageHeader.HeaderLink
      color='dark'
      variant='regular'
      renderLink={(props) => (
        <NavLink to={path} {...props}>
          <span
            className={cn({
              [classes.active]: StringUtils.removeLeadingSlash(menuItem.link) === currentRoutePath,
            })}
          >
            {t(menuItem.name)}
          </span>
        </NavLink>
      )}
    />
  );
}

function extractSecondLastRouterParam(pathname: string): string {
  const pathnameArray = pathname.split('/');
  return pathnameArray[pathnameArray.length - 2];
}

const DashboardHeaderMenu = () => {
  const { t } = useTranslation();
  const showButtonText = !useMediaQuery(MEDIA_QUERY_MAX_WIDTH);
  const { user, profileMenuGroups } = useHeaderContext();

  const triggerButtonText = useProfileMenuTriggerButtonText();

  return (
    <StudioPageHeader.ProfileMenu
      triggerButtonText={showButtonText ? triggerButtonText : undefined}
      ariaLabelTriggerButton={triggerButtonText}
      color='dark'
      variant='regular'
      profileImage={
        <StudioAvatar
          src={user?.avatar_url ? user.avatar_url : undefined}
          alt={t('general.profile_icon')}
          title={t('shared.header_profile_icon_text')}
        />
      }
      profileMenuGroups={profileMenuGroups}
    />
  );
};
