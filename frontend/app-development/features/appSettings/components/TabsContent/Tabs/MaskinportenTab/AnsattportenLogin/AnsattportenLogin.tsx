import React from 'react';
import type { ReactElement } from 'react';
import classes from './AnsattportenLogin.module.css';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioParagraph } from '@studio/components';
import { EnterIcon } from '@studio/icons';
import { loginWithAnsattPorten } from 'app-shared/api/paths';
import { openSettingsModalWithTabQueryKey } from 'app-development/hooks/useOpenSettingsModalBasedQueryParam';
import type { SettingsModalTabId } from 'app-development/types/SettingsModalTabId';

export function AnsattportenLogin(): ReactElement {
  const { t } = useTranslation();

  const pathname: string = window.location.pathname;
  const origin: string = window.location.origin;
  const fullPath: string = origin + pathname;
  console.log('pathname', pathname);
  console.log('origin', origin);
  console.log('fullPath', fullPath);
  console.log('window.location.href', window.location.href);
  console.log('window.location.search', window.location.search);

  const handleLoginWithAnsattporten = (): void => {
    window.location.href = loginWithAnsattPorten(getRedirectUrl());
  };

  return (
    <>
      <LoginIcon />
      <StudioParagraph className={classes.descriptionText}>
        {t('app_settings.maskinporten_tab_login_with_description')}
      </StudioParagraph>
      <StudioButton
        variant='primary'
        color='second'
        onClick={handleLoginWithAnsattporten}
        className={classes.loginButton}
      >
        {t('app_settings.maskinporten_tab_login_with_ansattporten')}
      </StudioButton>
    </>
  );
}

function LoginIcon(): ReactElement {
  return (
    <div className={classes.loginIconWrapper}>
      <div className={classes.loginIconBackground} />
      <EnterIcon className={classes.loginIcon} />
    </div>
  );
}

export function getRedirectUrl(): string {
  const maskinportenTab: SettingsModalTabId = 'maskinporten';
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set(openSettingsModalWithTabQueryKey, maskinportenTab);
  return url.pathname + url.search;
}
