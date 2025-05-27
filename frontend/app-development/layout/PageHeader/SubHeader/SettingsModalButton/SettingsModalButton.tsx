import React, { type ReactElement } from 'react';
import { StudioPageHeader, useMediaQuery } from '@studio/components-legacy';
import { ArrowLeftIcon, CogIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { SettingsModal } from './SettingsModal';
import { useSettingsModalContext } from '../../../../contexts/SettingsModalContext';
import { MEDIA_QUERY_MAX_WIDTH } from 'app-shared/constants';
import { usePageHeaderContext } from 'app-development/contexts/PageHeaderContext';
import { FeatureFlag, shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';
import { RoutePaths } from 'app-development/enums/RoutePaths';
import { useBlocker, useNavigate } from 'react-router-dom';
import type { Blocker } from 'react-router-dom';
import { useNavigateFrom } from './useNavigateFrom';

// TODO FIX NAVIGATE BACK CORRECTLY
export const SettingsModalButton = (): ReactElement => {
  const { t } = useTranslation();
  const { variant } = usePageHeaderContext();
  const { settingsRef } = useSettingsModalContext();

  const shouldDisplayText = !useMediaQuery(MEDIA_QUERY_MAX_WIDTH);
  const navigate = useNavigate();

  const { navigateFrom, currentRoutePath } = useNavigateFrom();
  const pageNavigateToSettingsFrom: RoutePaths = navigateFrom || RoutePaths.Overview;

  const isSettingsPage: boolean =
    currentRoutePath === RoutePaths.AppSettings && shouldDisplayFeature(FeatureFlag.SettingsPage);
  const buttonText: string = t(getButtonTextKey(isSettingsPage, pageNavigateToSettingsFrom));

  const handleClick = () => {
    if (isSettingsPage) {
      handleClickGoBackButton();
    } else {
      handleClickSettingsButton();
    }
  };

  /*
  const settingsButtonBlocker: Blocker = useBlocker(({ currentLocation, nextLocation }) => {
    //console.log('currentLocation in button', currentLocation);
    //console.log('nextLocation', nextLocation);

    const fromAboutTab: boolean = nextLocation.search.includes('currentTab=about');
    // console.log('fromAboutTab', fromAboutTab);
    const searchChanged: boolean = currentLocation.search !== nextLocation.search;

    return searchChanged && fromAboutTab;
  });*/

  const handleClickSettingsButton = () => {
    if (shouldDisplayFeature(FeatureFlag.SettingsPage)) {
      // console.log('navigateFrom', navigateFrom);
      //console.log('currentRoutePath', currentRoutePath);
      navigate(
        { pathname: RoutePaths.AppSettings, search: 'currentTab=about' },
        { state: { from: currentRoutePath } },
      );
      /*
      const searchParams = new URLSearchParams(window.location.search);
      searchParams.set('currentTab', 'about');
      window.history.pushState({}, '', `?${searchParams}`);*/
      /*navigate(
        {
          pathname: RoutePaths.AppSettings,
          search: `?currentTab=${pageNavigateToSettingsFrom}`,
        },
        {
          state: { from: currentRoutePath },
        },
      );*/
    } else {
      settingsRef.current.openSettings();
    }
  };

  const handleClickGoBackButton = () => {
    navigate(pageNavigateToSettingsFrom);
  };

  return (
    <>
      <StudioPageHeader.HeaderButton
        color='light'
        onClick={handleClick}
        icon={<ButtonIcon isSettingsPage={isSettingsPage} />}
        variant={variant}
        aria-label={buttonText}
      >
        {shouldDisplayText && buttonText}
      </StudioPageHeader.HeaderButton>
      <SettingsModal ref={settingsRef} />
    </>
  );
};

function getButtonTextKey(isSettingsPage: boolean, from?: string): string {
  return isSettingsPage ? `sync_header.settings_back_to_${from}` : 'sync_header.settings';
}

type ButtonIconProps = {
  isSettingsPage: boolean;
};
function ButtonIcon({ isSettingsPage }: ButtonIconProps): ReactElement {
  return isSettingsPage ? <ArrowLeftIcon /> : <CogIcon />;
}
