import React, { type ReactElement } from 'react';
import classes from './AnsattportenLogin.module.css';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioParagraph } from '@studio/components-legacy';
import { EnterIcon } from '@studio/icons';
import { loginWithAnsattPorten } from 'app-shared/api/paths';
import { openSettingsModalWithTabQueryKey } from '../../../../../../../../../hooks/useOpenSettingsModalBasedQueryParam';
import type { SettingsModalTabId } from '../../../../../../../../../types/SettingsModalTabId';

export const AnsattportenLogin = (): ReactElement => {
  const { t } = useTranslation();

  const handleLoginWithAnsattporten = (): void => {
    window.location.href = loginWithAnsattPorten(getRedirectUrl());
  };

  return (
    <>
      <LoginIcon />
      <StudioParagraph className={classes.descriptionText}>
        {t('settings_modal.maskinporten_tab_login_with_description')}
      </StudioParagraph>
      <StudioButton
        size='md'
        variant='primary'
        color='second'
        onClick={handleLoginWithAnsattporten}
        className={classes.loginButton}
      >
        {t('settings_modal.maskinporten_tab_login_with_ansattporten')}
      </StudioButton>
    </>
  );
};

const LoginIcon = (): ReactElement => {
  return (
    <div className={classes.loginIconWrapper}>
      <div className={classes.loginIconBackground} />
      <EnterIcon className={classes.loginIcon} />
    </div>
  );
};

export function getRedirectUrl(): string {
  const maskinportenTab: SettingsModalTabId = 'maskinporten';
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set(openSettingsModalWithTabQueryKey, maskinportenTab);
  return url.pathname + url.search;
}
