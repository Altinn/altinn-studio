import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import cn from 'classnames';
import type { AlertProps } from '@digdir/design-system-react';
import { Alert, Heading, Paragraph } from '@digdir/design-system-react';

type NoEnvironmentsAlertProps = AlertProps;
export const NoEnvironmentsAlert = ({ ...rest }: NoEnvironmentsAlertProps) => {
  const { t } = useTranslation();

  return (
    <Alert severity='warning' className={cn(rest.className)} {...rest}>
      <Heading level={2} size='small' spacing>
        {t('app_publish.no_env_title')}
      </Heading>
      <Paragraph spacing>
        <Trans i18nKey='app_publish.no_env_1'>
          <a href='mailto:tjenesteeier@altinn.no' />
        </Trans>
      </Paragraph>
      <Paragraph>
        <Trans i18nKey='app_publish.no_env_2'>
          <a target='_new' rel='noopener noreferrer' />
        </Trans>
      </Paragraph>
    </Alert>
  );
};
