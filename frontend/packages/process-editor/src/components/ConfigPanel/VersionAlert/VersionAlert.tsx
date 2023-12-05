import { Alert, Heading, Link, Paragraph } from '@digdir/design-system-react';
import classes from './VersionAlert.module.css';
import React, { ReactNode } from 'react';
import { useTranslation, Trans } from 'react-i18next';

export type VersionAlertProps = {
  appLibVersion: string;
};

/**
 * @component
 *  Displays the alert informing the user that their version is too old
 *
 * @property {string}[appLibVersion] - The app-lib version the user has
 *
 * @returns {ReactNode} - The rendered component
 */
export const VersionAlert = ({ appLibVersion }: VersionAlertProps): ReactNode => {
  const { t } = useTranslation();

  return (
    <Alert severity='warning' className={classes.alert}>
      <Heading level={1} size='xsmall' spacing>
        {t('process_editor.too_old_version_title')}
      </Heading>
      <Paragraph spacing size='small' className={classes.alertText}>
        {t('process_editor.too_old_version_text', { version: appLibVersion })}
      </Paragraph>
      <Paragraph spacing size='small'>
        {t('process_editor.need_to_contact_text')}
      </Paragraph>
      <Paragraph size='small' spacing>
        <Trans i18nKey={t('process_editor.help_text_and_links')}>
          <Link
            href='https://docs.altinn.studio/nb/app/maintainance/dependencies/'
            target='_new'
            rel='noopener noreferrer'
          >
            Les mer om hvordan dette gjøres her
          </Link>
          . Trenger du hjelp til å oppgradere, kan du <Link href='/contact'>kontakte oss</Link>.
        </Trans>
      </Paragraph>
    </Alert>
  );
};
