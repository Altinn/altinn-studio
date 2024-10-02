import React, { useRef, useState } from 'react';
import { StudioProperty } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { FileIcon } from '@studio/icons';
import { usePdf } from '../../../../hooks/usePdf/usePdf';
import { ConvertChoicesModal } from './ConvertPageToPdfWhenExistingModal/ConvertChoicesModal';
import { useSavableFormLayoutSettings } from '@altinn/ux-editor/hooks/useSavableFormLayoutSettings';

export const PdfConfig = () => {
  const { t } = useTranslation();
  const { isCurrentPagePdf, getPdfLayoutName, convertCurrentPageToPdf, convertExistingPdfToPage } =
    usePdf();
  const [isPdfUpdated, setIsPdfUpdated] = useState(false);
  const savableLayoutSettings = useSavableFormLayoutSettings();
  const convertChoicesDialogRef = useRef<HTMLDialogElement>(null);

  const handleClickConvertButton = () => {
    if (!!getPdfLayoutName()) {
      convertChoicesDialogRef.current?.showModal();
    } else {
      convertCurrentPageToPdf();
      savableLayoutSettings.save();
    }
  };

  const handleConvertExistingPdfToFormLayout = () => {
    convertExistingPdfToPage();
    savableLayoutSettings.save();
  };

  const handleModalAction = () => {
    // Trigger re-render after modal action
    setIsPdfUpdated(!isPdfUpdated);
  };

  return (
    <div>
      <ConvertChoicesModal handleModalAction={handleModalAction} ref={convertChoicesDialogRef} />
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
    </div>
  );
};
