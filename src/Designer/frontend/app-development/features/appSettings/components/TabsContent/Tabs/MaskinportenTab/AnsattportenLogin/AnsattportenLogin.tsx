import React from 'react';
import type { ReactElement } from 'react';
import classes from './AnsattportenLogin.module.css';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioParagraph } from '@studio/components';
import { EnterIcon } from '@studio/icons';
import { loginWithAnsattPorten } from 'app-shared/api/paths';
import type { SettingsPageTabId } from '../../../../../../../types/SettingsPageTabId';
import { settingsPageQueryParamKey } from '../../../../../utils';

export function AnsattportenLogin(): ReactElement {
  const { t } = useTranslation();

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
  const maskinportenTab: SettingsPageTabId = 'maskinporten';
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set(settingsPageQueryParamKey, maskinportenTab);
  return url.pathname + url.search;
}
