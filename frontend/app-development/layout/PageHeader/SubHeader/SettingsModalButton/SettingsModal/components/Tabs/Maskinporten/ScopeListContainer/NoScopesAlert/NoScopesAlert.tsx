import React, { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import classes from './NoScopesAlert.module.css';
import { GetInTouchWith } from 'app-shared/getInTouch';
import { EmailContactProvider } from 'app-shared/getInTouch/providers';
import { LoggedInTitle } from '../LoggedInTitle';
import { StudioAlert, StudioHeading, StudioLink, StudioParagraph } from '@studio/components-legacy';

export const NoScopesAlert = (): ReactElement => {
  const { t } = useTranslation();

  const contactByEmail = new GetInTouchWith(new EmailContactProvider());

  return (
    <div>
      <LoggedInTitle />
      <StudioAlert severity='info' className={classes.noScopeAlert}>
        <StudioHeading level={4} size='xs' spacing>
          {t('settings_modal.maskinporten_no_scopes_available_title')}
        </StudioHeading>
        <StudioParagraph size='sm'>
          {t('settings_modal.maskinporten_no_scopes_available_description')}
        </StudioParagraph>
        <StudioLink
          href={contactByEmail.url('serviceOwner')}
          target='_blank'
          rel='noopener noreferrer'
        >
          {t('settings_modal.maskinporten_no_scopes_available_link')}
        </StudioLink>
      </StudioAlert>
    </div>
  );
};
