import React, { type ReactElement } from 'react';
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
import { StringUtils, UrlUtils } from '@studio/pure-functions';
import { FeatureFlag, shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';
import { SubHeader } from './SubHeader';
import { Subroute } from '../../../enums/Subroute';
import { isOrg } from '../../../utils/orgUtils';
import { SmallHeaderMenu } from './SmallHeaderMenu';
import { mapNavigationMenuToProfileMenu } from '../../../utils/headerUtils';

export type DashboardHeaderProps = {
  showSubMenu: boolean;
  isRepoError?: boolean;
};

export const DashboardHeader = ({
  showSubMenu,
  isRepoError,
}: DashboardHeaderProps): ReactElement => {
  const pageHeaderTitle: string = usePageHeaderTitle();
  const shouldDisplayDesktopMenu = !useMediaQuery(MEDIA_QUERY_MAX_WIDTH);
  const selectedContext = useSelectedContext();
  const location = useLocation();
  const currentRoutePath: string = UrlUtils.extractSecondLastRouterParam(location.pathname);

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
        <StudioPageHeader.Left title={pageHeaderTitle} showTitle={shouldDisplayDesktopMenu} />
        {shouldDisplayDesktopMenu && <CenterContent />}
        <StudioPageHeader.Right>
          <RightContent />
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

function CenterContent(): ReactElement {
  const { menuItems } = useHeaderContext();
  return (
    <StudioPageHeader.Center>
      {shouldDisplayFeature(FeatureFlag.OrgLibrary) &&
        menuItems.map((menuItem: HeaderMenuItem) => (
          <TopNavigationMenuItem key={menuItem.name} menuItem={menuItem} />
        ))}
    </StudioPageHeader.Center>
  );
}

type TopNavigationMenuProps = {
  menuItem: HeaderMenuItem;
};

function TopNavigationMenuItem({ menuItem }: TopNavigationMenuProps): ReactElement {
  const selectedContext: string = useSelectedContext();
  const { t } = useTranslation();
  const location = useLocation();
  const path: string = `${menuItem.link}/${selectedContext}`;
  const currentRoutePath: string = UrlUtils.extractSecondLastRouterParam(location.pathname);

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

function RightContent(): ReactElement {
  const { t } = useTranslation();
  const { user, profileMenuGroups } = useHeaderContext();

  const isSmallScreen = useMediaQuery(MEDIA_QUERY_MAX_WIDTH);
  const triggerButtonText = useProfileMenuTriggerButtonText();

  if (isSmallScreen) {
    return <SmallHeaderMenu />;
  }

  return (
    <StudioPageHeader.ProfileMenu
      triggerButtonText={!isSmallScreen ? triggerButtonText : undefined}
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
      profileMenuGroups={mapNavigationMenuToProfileMenu(profileMenuGroups)}
    />
  );
}
