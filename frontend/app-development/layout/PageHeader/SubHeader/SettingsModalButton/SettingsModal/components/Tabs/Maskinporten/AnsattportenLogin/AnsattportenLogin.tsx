import React, { type ReactElement } from 'react';
import classes from './AnsattportenLogin.module.css';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioParagraph } from '@studio/components';
import { EnterIcon } from '@studio/icons';

export const AnsattportenLogin = (): ReactElement => {
  const { t } = useTranslation();

  const handleLoginWithAnsattporten = (): void => {
    console.log('Will be implemented in next iteration when backend is ready');
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
