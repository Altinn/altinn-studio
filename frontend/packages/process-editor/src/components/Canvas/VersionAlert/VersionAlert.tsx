import { Alert, Heading, Link, Paragraph } from '@digdir/design-system-react';
import classes from './VersionAlert.module.css';
import React, { ReactNode } from 'react';
import { useTranslation, Trans } from 'react-i18next';

export type VersionAlertProps = {
  appLibVersion: string;
};

export const VersionAlert = ({ appLibVersion }: VersionAlertProps): ReactNode => {
  const { t } = useTranslation();

  return (
    <Alert severity='warning' className={classes.alert}>
      <Heading level={1} size='xsmall' spacing>
        {t('process_editor.too_old_version_title')}
      </Heading>
      <Paragraph className={classes.alertText} size='small'>
        <Trans i18nKey={t('process_editor.too_old_version_text')}>
          Applikasjonen din har versjon <strong>{appLibVersion}</strong> av app-lib-pakken.
          <br />
          Versjonen er for gammel for å kunne redigere denne modellen. <br />
          <br />
          Du kan se på prosessen, men vi anbefaler at du oppgraderer til versjon 8 eller nyere.
          <br />
          <br />
          Trenger du hjelp til å oppgradere, kan du kontakte{' '}
          <Link href='servicedesk@altinn.no' target='_new' rel='noopener noreferrer'>
            servicedesken
          </Link>{' '}
          vår.
        </Trans>
      </Paragraph>
    </Alert>
  );
};
