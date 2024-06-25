import React from 'react';
import { StudioButton } from '@studio/components';
import { Paragraph } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import classes from './OverrideCurrentPdfByConversionChoices.module.css';

export interface OverrideCurrentPdfByConversionChoicesProps {
  onConvertPageToPdf: (deleteCurrent: boolean) => void;
}

export const OverrideCurrentPdfByConversionChoices = ({
  onConvertPageToPdf,
}: OverrideCurrentPdfByConversionChoicesProps) => {
  const { t } = useTranslation();

  return (
    <div className={classes.modal}>
      <Paragraph>{t('ux_editor.page_config_pdf_convert_info_when_custom_pdf_exists')}</Paragraph>
      <div className={classes.buttonContainer}>
        <StudioButton size='small' onClick={() => onConvertPageToPdf(false)}>
          {t('ux_editor.page_config_pdf_convert_existing_pdf')}
        </StudioButton>
        <StudioButton
          color='danger'
          size='small'
          variant='tertiary'
          onClick={() => onConvertPageToPdf(true)}
        >
          {t('ux_editor.page_config_pdf_delete_existing_pdf')}
        </StudioButton>
      </div>
    </div>
  );
};
