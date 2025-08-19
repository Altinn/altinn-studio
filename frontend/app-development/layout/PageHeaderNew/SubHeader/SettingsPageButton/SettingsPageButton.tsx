import React, { type ReactElement } from 'react';
import { useMediaQuery } from '@studio/components-legacy';
import { StudioPageHeader } from '@studio/components';
import { ArrowLeftIcon, CogIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { MEDIA_QUERY_MAX_WIDTH } from 'app-shared/constants';
import { usePageHeaderContext } from 'app-development/contexts/PageHeaderContext';
import { RoutePaths } from 'app-development/enums/RoutePaths';
import { useNavigate } from 'react-router-dom';
import { useNavigateFrom } from './useNavigateFrom';

export const SettingsPageButton = (): ReactElement => {
  const { t } = useTranslation();
  const { variant } = usePageHeaderContext();

  const shouldDisplayText = !useMediaQuery(MEDIA_QUERY_MAX_WIDTH);
  const navigate = useNavigate();

  const { navigateFrom, currentRoutePath } = useNavigateFrom();
  const pageNavigateToSettingsFrom: string = navigateFrom || RoutePaths.Overview;

  const isSettingsPage: boolean = splitKeyFromFullPath(currentRoutePath) === RoutePaths.AppSettings;
  const buttonText: string = t(getButtonTextKey(isSettingsPage, pageNavigateToSettingsFrom));

  const handleClick = () => {
    if (isSettingsPage) {
      handleClickGoBackButton();
    } else {
      handleClickSettingsButton();
    }
  };

  const handleClickSettingsButton = () => {
    navigate(
      { pathname: RoutePaths.AppSettings, search: 'currentTab=about' },
      { state: { from: currentRoutePath } },
    );
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
  if (isSettingsPage) {
    const fromKey: string = splitKeyFromFullPath(from || '');
    return `sync_header.settings_back_to_${fromKey}`;
  }
  return 'sync_header.settings';
}
function splitKeyFromFullPath(fullPath: string): string {
  const parts: string[] = fullPath.split('?');
  return parts[0];
}

type ButtonIconProps = {
  isSettingsPage: boolean;
};
function ButtonIcon({ isSettingsPage }: ButtonIconProps): ReactElement {
  return isSettingsPage ? <ArrowLeftIcon /> : <CogIcon />;
}
