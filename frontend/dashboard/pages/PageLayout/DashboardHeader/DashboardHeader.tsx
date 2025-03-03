import React, { type ReactElement } from 'react';
import classes from './DashboardHeader.module.css';
import cn from 'classnames';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  StudioAvatar,
  StudioPageHeader,
  type StudioProfileMenuGroup,
  type StudioProfileMenuItem,
  useMediaQuery,
} from '@studio/components';
import { StringUtils } from '@studio/pure-functions';
import { MEDIA_QUERY_MAX_WIDTH } from 'app-shared/constants';
import { FeatureFlag, shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';
import { useProfileMenuTriggerButtonText } from '../../../hooks/useProfileMenuTriggerButtonText';
import { useSelectedContext } from '../../../hooks/useSelectedContext';
import type { HeaderMenuItem } from '../../../types/HeaderMenuItem';
import { usePageHeaderTitle } from '../../../hooks/usePageHeaderTitle';
import {
  dashboardHeaderMenuItems,
  extractSecondLastRouterParam,
} from '../../../utils/headerUtils/headerUtils';
import { useHeaderContext } from '../../../context/HeaderContext/HeaderContext';
import { SmallHeaderMenu } from './SmallHeaderMenu';
import { type NavigationMenuGroup } from 'dashboard/types/NavigationMenuGroup';
import { type NavigationMenuItem } from 'dashboard/types/NavigationMenuItem';

export const DashboardHeader = (): ReactElement => {
  const pageHeaderTitle: string = usePageHeaderTitle();

  const shouldDisplayDesktopMenu = !useMediaQuery(MEDIA_QUERY_MAX_WIDTH);

  return (
    <StudioPageHeader>
      <StudioPageHeader.Main>
        <StudioPageHeader.Left title={pageHeaderTitle} showTitle={shouldDisplayDesktopMenu} />
        {shouldDisplayDesktopMenu && <CenterContent />}
        <StudioPageHeader.Right>
          <RightContent />
        </StudioPageHeader.Right>
      </StudioPageHeader.Main>
    </StudioPageHeader>
  );
};

function CenterContent(): ReactElement {
  return (
    <StudioPageHeader.Center>
      {shouldDisplayFeature(FeatureFlag.OrgLibrary) &&
        dashboardHeaderMenuItems.map((menuItem: HeaderMenuItem) => (
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

export function mapNavigationMenuToProfileMenu(
  navigationGroups: NavigationMenuGroup[],
): StudioProfileMenuGroup[] {
  return navigationGroups.map(mapNavigationGroup);
}

function mapNavigationGroup(group: NavigationMenuGroup): StudioProfileMenuGroup {
  return {
    items: group.items.map(mapNavigationItem),
  };
}

function mapNavigationItem(item: NavigationMenuItem): StudioProfileMenuItem {
  return {
    itemName: item.name,
    action: mapNavigationAction(item.action),
  };
}

function mapNavigationAction(
  action: NavigationMenuItem['action'],
): StudioProfileMenuItem['action'] {
  return action.type === 'button'
    ? { type: 'button', onClick: action.onClick }
    : { type: 'link', href: action.href, openInNewTab: action.openInNewTab };
}
