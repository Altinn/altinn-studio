import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import cn from 'classnames';
import type { AlertProps } from '@digdir/designsystemet-react';
import { Alert, Heading, Paragraph } from '@digdir/designsystemet-react';
import { EmailContactProvider } from 'app-shared/userFeedback/providers';
import { Contact } from 'app-shared/userFeedback';

type NoEnvironmentsAlertProps = AlertProps;
export const NoEnvironmentsAlert = ({ ...rest }: NoEnvironmentsAlertProps) => {
  const { t } = useTranslation();
  const contactByEmail = new Contact(new EmailContactProvider());
  return (
    <Alert severity='warning' className={cn(rest.className)} {...rest}>
      <Heading level={2} size='small' spacing>
        {t('app_deployment.no_env_title')}
      </Heading>
      <Paragraph spacing>
        <Trans i18nKey='app_deployment.no_env_1'>
          <a href={contactByEmail.url('serviceOwner')} />
        </Trans>
      </Paragraph>
      <Paragraph>
        <Trans i18nKey='app_deployment.no_env_2'>
          <a target='_new' rel='noopener noreferrer' />
        </Trans>
      </Paragraph>
    </Alert>
  );
};
