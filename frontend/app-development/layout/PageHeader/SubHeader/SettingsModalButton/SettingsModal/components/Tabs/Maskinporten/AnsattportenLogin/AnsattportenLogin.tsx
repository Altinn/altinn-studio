import React, { type ReactElement } from 'react';
import classes from './AnsattportenLogin.module.css';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioParagraph } from '@studio/components';
import { EnterIcon } from '@studio/icons';
import { loginWithAnsattPorten } from 'app-shared/api/paths';

export const AnsattportenLogin = (): ReactElement => {
  const { t } = useTranslation();

  const handleLoginWithAnsattporten = (): void => {
    window.location.href = loginWithAnsattPorten(window.location.pathname + window.location.search);
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
