import React, { useState } from 'react';
import { StudioProperty } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { FileIcon } from '@studio/icons';
import { usePdf } from '../../../../hooks/usePdf/usePdf';
import { ConvertChoicesModal } from './ConvertPageToPdfWhenExistingModal/ConvertChoicesModal';
import { useSavableFormLayoutSettings } from '@altinn/ux-editor/hooks/useSavableFormLayoutSettings';

export const PdfConfig = () => {
  const { t } = useTranslation();
  const [showConvertChoices, setShowConvertChoices] = useState<boolean>(false);
  const { isCurrentPagePdf, getPdfLayoutName, convertCurrentPageToPdf, convertExistingPdfToPage } =
    usePdf();
  const savableLayoutSettings = useSavableFormLayoutSettings();

  const handleClickConvertButton = () => {
    if (!!getPdfLayoutName()) {
      setShowConvertChoices(true);
    } else {
      convertCurrentPageToPdf();
      savableLayoutSettings.save();
    }
  };

  const handleConvertExistingPdfToFormLayout = () => {
    convertExistingPdfToPage();
    savableLayoutSettings.save();
  };

  return (
    <>
      {showConvertChoices && (
        <ConvertChoicesModal
          showConvertChoices={showConvertChoices}
          onClose={() => setShowConvertChoices(false)}
        />
      )}
      {isCurrentPagePdf() ? (
        <StudioProperty.Button
          onClick={handleConvertExistingPdfToFormLayout}
          property={t('ux_editor.page_config_pdf_convert_existing_pdf')}
          size='small'
          icon={<FileIcon />}
        />
      ) : (
        <StudioProperty.Button
          onClick={handleClickConvertButton}
          property={t('ux_editor.page_config_pdf_convert_page_to_pdf')}
          size='small'
          icon={<FileIcon />}
        />
      )}
    </>
  );
};
