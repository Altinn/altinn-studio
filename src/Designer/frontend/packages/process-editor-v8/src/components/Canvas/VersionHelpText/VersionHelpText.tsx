import classes from './VersionHelpText.module.css';
import { StudioHelpText, StudioParagraph } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useBpmnContext } from '../../../contexts/BpmnContext';

import type { JSX } from 'react';

/**
 * @component
 *  Displays the helptext informing the user that their version is too old
 *
 * @returns {JSX.Element} - The rendered component
 */
export const VersionHelpText = (): JSX.Element => {
  const { t } = useTranslation();
  const { appVersion } = useBpmnContext();

  return (
    <div className={classes.helpTextWrapper}>
      <StudioParagraph>{t('process_editor.too_old_version_title')}</StudioParagraph>
      <StudioHelpText
        aria-label={t('process_editor.too_old_version_helptext_title')}
        placement='bottom'
      >
        <StudioParagraph spacing className={classes.helpTextContent}>
          {t('process_editor.too_old_version_helptext_content', {
            version: appVersion?.backendVersion,
          })}
        </StudioParagraph>
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
            eller <Link href='/info/contact'>ta kontakt med oss</Link>.
          </Trans>
        </Paragraph> */}
      </StudioHelpText>
    </div>
  );
};
