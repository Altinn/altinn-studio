import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import cn from 'classnames';
import type { AlertProps } from '@digdir/designsystemet-react';
import { Alert, Heading, Paragraph } from '@digdir/designsystemet-react';
import { EmailContactProvider } from 'app-shared/getInTouch/providers';
import { GetInTouchWith } from 'app-shared/getInTouch';
import { altinnDocsUrl } from 'app-shared/ext-urls';

type NoEnvironmentsAlertProps = AlertProps;
export const NoEnvironmentsAlert = ({ ...rest }: NoEnvironmentsAlertProps) => {
  const { t } = useTranslation();
  const contactByEmail = new GetInTouchWith(new EmailContactProvider());
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
          <a
            href={altinnDocsUrl({ relativeUrl: 'altinn-studio/reference/testing/local/' })}
            target='_new'
            rel='noopener noreferrer'
          />
        </Trans>
      </Paragraph>
    </Alert>
  );
};
