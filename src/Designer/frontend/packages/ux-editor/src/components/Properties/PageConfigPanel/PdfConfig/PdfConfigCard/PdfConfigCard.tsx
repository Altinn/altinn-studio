import React, { type ReactElement } from 'react';
import classes from './PdfConfigCard.module.css';
import { StudioSwitch, StudioParagraph, StudioCard, StudioHeading } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { usePdf } from '../../../../../hooks/usePdf/usePdf';
import { useSavableFormLayoutSettings } from '../../../../../hooks/useSavableFormLayoutSettings';

export type PdfConfigCardProps = {
  onClickConvert: () => void;
};

export const PdfConfigCard = ({ onClickConvert }: PdfConfigCardProps): ReactElement => {
  const { t } = useTranslation();
  const { isCurrentPagePdf, convertExistingPdfToPage } = usePdf();
  const savableLayoutSettings = useSavableFormLayoutSettings();

  const handleConvertExistingPdfToFormLayout = () => {
    convertExistingPdfToPage();
    savableLayoutSettings.save();
  };

  const toggleSwitch = () => {
    if (isCurrentPagePdf()) handleConvertExistingPdfToFormLayout();
    else onClickConvert();
  };

  const switchAriaLabel = isCurrentPagePdf()
    ? t('ux_editor.page_config_pdf_convert_existing_pdf')
    : t('ux_editor.page_config_pdf_convert_page_to_pdf');

  return (
    <StudioCard color='neutral' className={classes.card}>
      <div className={classes.headerWrapper}>
        <StudioHeading level={2} data-size='2xs'>
          {t('ux_editor.page_config_pdf_card_heading')}
        </StudioHeading>
        <StudioSwitch
          checked={isCurrentPagePdf()}
          onChange={toggleSwitch}
          aria-label={switchAriaLabel}
        />
      </div>
      <StudioParagraph spacing>{t('ux_editor.page_config_pdf_card_text_top')}</StudioParagraph>
      <StudioParagraph>{t('ux_editor.page_config_pdf_card_text_bottom')}</StudioParagraph>
    </StudioCard>
  );
};
