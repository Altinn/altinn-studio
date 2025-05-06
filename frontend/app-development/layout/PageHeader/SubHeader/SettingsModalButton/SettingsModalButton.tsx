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
import { useLocation, useNavigate } from 'react-router-dom';
import { UrlUtils } from '@studio/pure-functions';

export const SettingsModalButton = (): ReactElement => {
  const { t } = useTranslation();
  const { variant } = usePageHeaderContext();
  const { settingsRef } = useSettingsModalContext();

  const shouldDisplayText = !useMediaQuery(MEDIA_QUERY_MAX_WIDTH);
  const navigate = useNavigate();
  const location = useLocation();
  const urlState = location?.state as { from: RoutePaths } | null;
  const currentRoutePath: string = UrlUtils.extractThirdRouterParam(location?.pathname);
  const pageNavigateToSettingsFrom: RoutePaths = urlState?.from || RoutePaths.Overview;

  const isSettingsPage: boolean =
    currentRoutePath === RoutePaths.AppSettings && shouldDisplayFeature(FeatureFlag.SettingsPage);

  const buttonText: string = isSettingsPage
    ? t('sync_header.settings_go_back')
    : t('sync_header.settings');

  const handleClick = () => {
    if (isSettingsPage) {
      handleClickGoBackButton();
    } else {
      handleClickSettingsButton();
    }
  };

  const handleClickSettingsButton = () => {
    if (shouldDisplayFeature(FeatureFlag.SettingsPage)) {
      navigate(RoutePaths.AppSettings, { state: { from: currentRoutePath } });
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
        icon={isSettingsPage ? <ArrowLeftIcon /> : <CogIcon />}
        variant={variant}
        aria-label={buttonText}
      >
        {shouldDisplayText && buttonText}
      </StudioPageHeader.HeaderButton>
      <SettingsModal ref={settingsRef} />
    </>
  );
};
