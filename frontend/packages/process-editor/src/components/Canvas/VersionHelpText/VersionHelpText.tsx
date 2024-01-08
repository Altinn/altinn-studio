import React from 'react';
import classes from './VersionHelpText.module.css';
import { HelpText, Paragraph } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { useBpmnContext } from '../../../contexts/BpmnContext';

/**
 * @component
 *  Displays the helptext informing the user that their version is too old
 *
 * @returns {JSX.Element} - The rendered component
 */
export const VersionHelpText = (): JSX.Element => {
  const { t } = useTranslation();
  const { appLibVersion } = useBpmnContext();

  return (
    <div className={classes.helpTextWrapper}>
      <Paragraph size='medium'>{t('process_editor.too_old_version_title')}</Paragraph>
      <HelpText
        size='medium'
        title={t('process_editor.too_old_version_helptext_title')}
        placement='bottom'
      >
        <Paragraph spacing size='small' className={classes.helpTextContent}>
          {t('process_editor.too_old_version_helptext_content', { version: appLibVersion })}
        </Paragraph>
        {/*
          Temporarily hidden until v8 becomes available.
          TODO: Add back the below text/links when v8 is available.
          Github: https://github.com/Altinn/altinn-studio/issues/11968
        */}
        {/* <Paragraph size='small' spacing>
          <Trans i18nKey={t('process_editor.help_text_and_links')}>
            Trenger du hjelp til å oppgradere, kan du{' '}
            <Link href='https://docs.altinn.studio/nb/app/maintainance/dependencies/'>
              lese mer her
            </Link>{' '}
            eller <Link href='/contact'>ta kontakt med oss</Link>.
          </Trans>
        </Paragraph> */}
      </HelpText>
    </div>
  );
};
