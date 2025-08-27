import React, { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import classes from './NoScopesAlert.module.css';
import { GetInTouchWith } from 'app-shared/getInTouch';
import { EmailContactProvider } from 'app-shared/getInTouch/providers';
import { LoggedInTitle } from '../LoggedInTitle';
import { StudioAlert, StudioHeading, StudioLink, StudioParagraph } from '@studio/components';

export function NoScopesAlert(): ReactElement {
  const { t } = useTranslation();

  const contactByEmail = new GetInTouchWith(new EmailContactProvider());

  return (
    <div>
      <LoggedInTitle />
      <StudioAlert data-color='info' className={classes.noScopeAlert}>
        <StudioHeading data-size='2xs' level={4}>
          {t('app_settings.maskinporten_no_scopes_available_title')}
        </StudioHeading>
        <StudioParagraph>
          {t('app_settings.maskinporten_no_scopes_available_description')}
        </StudioParagraph>
        <StudioLink
          href={contactByEmail.url('serviceOwner')}
          target='_blank'
          rel='noopener noreferrer'
        >
          {t('app_settings.maskinporten_no_scopes_available_link')}
        </StudioLink>
      </StudioAlert>
    </div>
  );
}
