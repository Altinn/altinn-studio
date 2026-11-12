import type { ReactElement } from 'react';
import { useMediaQuery } from '@designer/hooks';
import { StudioPageHeader } from '@designer/components';
import { ArrowLeftIcon, CogIcon } from '@designer/icons';
import { useTranslation } from 'react-i18next';
import { MEDIA_QUERY_MAX_WIDTH } from 'app-shared/constants';
import type { TranslationKey } from '@altinn-studio/language/type';

import { RoutePaths } from 'app-development/enums/RoutePaths';
import { useNavigate } from 'react-router-dom';
import { useNavigateFrom } from './useNavigateFrom';
import classes from './SettingsPageButton.module.css';

export const SettingsPageButton = (): ReactElement => {
  const { t } = useTranslation();

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
    <div className={classes.wrapper}>
      <StudioPageHeader.HeaderButton
        data-color='neutral'
        onClick={handleClick}
        icon={<ButtonIcon isSettingsPage={isSettingsPage} />}
        variant='tertiary'
        aria-label={buttonText}
      >
        {shouldDisplayText && buttonText}
      </StudioPageHeader.HeaderButton>
    </div>
  );
};

type PageWithSettingsButton = Exclude<RoutePaths, RoutePaths.Root | RoutePaths.AppSettings>;

// The type makes each page have a text for the button that goes back from the settings.
const backButtonTextKeys: Record<PageWithSettingsButton, TranslationKey> = {
  [RoutePaths.Overview]: 'sync_header.settings_back_to_overview',
  [RoutePaths.UIEditor]: 'sync_header.settings_back_to_ui-editor',
  [RoutePaths.DataModel]: 'sync_header.settings_back_to_data-model',
  [RoutePaths.Deploy]: 'sync_header.settings_back_to_deploy',
  [RoutePaths.Text]: 'sync_header.settings_back_to_text-editor',
  [RoutePaths.ProcessEditor]: 'sync_header.settings_back_to_process-editor',
  [RoutePaths.ContentLibrary]: 'sync_header.settings_back_to_content-library',
  [RoutePaths.AiAssistant]: 'sync_header.settings_back_to_ai-assistant',
};

function getButtonTextKey(isSettingsPage: boolean, from?: string): string {
  if (isSettingsPage) {
    const fromKey: string = splitKeyFromFullPath(from || '');
    return isPageWithSettingsButton(fromKey)
      ? backButtonTextKeys[fromKey]
      : `sync_header.settings_back_to_${fromKey}`;
  }
  return 'sync_header.settings';
}

function isPageWithSettingsButton(page: string): page is PageWithSettingsButton {
  return Object.hasOwn(backButtonTextKeys, page);
}
function splitKeyFromFullPath(fullPath: string): string {
  const parts: string[] = fullPath.split('?')[0].split('/');
  return parts[0];
}

type ButtonIconProps = {
  isSettingsPage: boolean;
};
function ButtonIcon({ isSettingsPage }: ButtonIconProps): ReactElement {
  return isSettingsPage ? <ArrowLeftIcon /> : <CogIcon />;
}
