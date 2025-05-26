import React, { type ReactElement } from 'react';
import { StudioPageHeader, useMediaQuery } from '@studio/components-legacy';
import { ArrowLeftIcon, CogIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { MEDIA_QUERY_MAX_WIDTH } from 'app-shared/constants';
import { usePageHeaderContext } from 'app-development/contexts/PageHeaderContext';
import { RoutePaths } from 'app-development/enums/RoutePaths';
import { useNavigate } from 'react-router-dom';
import { useNavigateFrom } from './useNavigateFrom';

export const SettingsModalButton = (): ReactElement => {
  const { t } = useTranslation();
  const { variant } = usePageHeaderContext();

  const shouldDisplayText = !useMediaQuery(MEDIA_QUERY_MAX_WIDTH);
  const navigate = useNavigate();

  const { navigateFrom, currentRoutePath } = useNavigateFrom();
  const pageNavigateToSettingsFrom: RoutePaths = navigateFrom || RoutePaths.Overview;

  const isSettingsPage: boolean = currentRoutePath === RoutePaths.AppSettings;
  const buttonText: string = t(getButtonTextKey(isSettingsPage, pageNavigateToSettingsFrom));

  const handleClick = () => {
    if (isSettingsPage) {
      handleClickGoBackButton();
    } else {
      handleClickSettingsButton();
    }
  };

  const handleClickSettingsButton = () => {
    navigate(RoutePaths.AppSettings, { state: { from: currentRoutePath } });
  };

  const handleClickGoBackButton = () => {
    navigate(pageNavigateToSettingsFrom);
  };

  return (
    <StudioPageHeader.HeaderButton
      color='light'
      onClick={handleClick}
      icon={<ButtonIcon isSettingsPage={isSettingsPage} />}
      variant={variant}
      aria-label={buttonText}
    >
      {shouldDisplayText && buttonText}
    </StudioPageHeader.HeaderButton>
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
