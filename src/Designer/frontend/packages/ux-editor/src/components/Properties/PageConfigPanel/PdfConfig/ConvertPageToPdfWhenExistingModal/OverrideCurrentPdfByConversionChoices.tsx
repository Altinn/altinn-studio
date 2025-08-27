import React from 'react';
import { StudioButton } from 'libs/studio-components-legacy/src';
import { Paragraph } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';
import classes from './OverrideCurrentPdfByConversionChoices.module.css';

export interface OverrideCurrentPdfByConversionChoicesProps {
  onConvertPageToPdfAndConvertCurrent: () => void;
  onConvertPageToPdfAndDeleteCurrent: () => void;
}

export const OverrideCurrentPdfByConversionChoices = ({
  onConvertPageToPdfAndConvertCurrent,
  onConvertPageToPdfAndDeleteCurrent,
}: OverrideCurrentPdfByConversionChoicesProps) => {
  const { t } = useTranslation();

  return (
    <div className={classes.modal}>
      <Paragraph>{t('ux_editor.page_config_pdf_convert_info_when_custom_pdf_exists')}</Paragraph>
      <div className={classes.buttonContainer}>
        <StudioButton size='small' onClick={onConvertPageToPdfAndConvertCurrent}>
          {t('ux_editor.page_config_pdf_convert_existing_pdf')}
        </StudioButton>
        <StudioButton
          color='danger'
          size='small'
          variant='tertiary'
          onClick={onConvertPageToPdfAndDeleteCurrent}
        >
          {t('ux_editor.page_config_pdf_delete_existing_pdf')}
        </StudioButton>
      </div>
    </div>
  );
};
