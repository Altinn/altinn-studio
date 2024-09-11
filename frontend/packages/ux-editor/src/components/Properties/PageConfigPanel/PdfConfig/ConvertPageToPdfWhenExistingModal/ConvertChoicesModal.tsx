import React from 'react';
import { StudioModal } from '@studio/components';
import { OverrideCurrentPdfByConversionChoices } from './OverrideCurrentPdfByConversionChoices';
import { Heading } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';
import { usePdf } from '@altinn/ux-editor/hooks/usePdf/usePdf';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppContext } from '@altinn/ux-editor/hooks';
import { useDeleteLayoutMutation } from '@altinn/ux-editor/hooks/mutations/useDeleteLayoutMutation';
import { useSavableFormLayoutSettings } from '@altinn/ux-editor/hooks/useSavableFormLayoutSettings';

type ConvertChoicesModalProps = {
  showConvertChoices: boolean;
  onClose: () => void;
};
export const ConvertChoicesModal = ({ showConvertChoices, onClose }: ConvertChoicesModalProps) => {
  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName } = useAppContext();
  const { t } = useTranslation();
  const { mutate: deleteLayout } = useDeleteLayoutMutation(org, app, selectedFormLayoutSetName);
  const { getPdfLayoutName, convertCurrentPageToPdf, convertExistingPdfToPage } = usePdf();
  const savableLayoutSettings = useSavableFormLayoutSettings();

  const handleConvertPageToPdfAndConvertCurrent = () => {
    convertExistingPdfToPage();
    convertCurrentPageToPdf();
    savableLayoutSettings.save();
    onClose();
  };

  const handleConvertPageToPdfAndDeleteCurrent = () => {
    const currentPdfLayoutName = getPdfLayoutName();
    convertCurrentPageToPdf();
    deleteLayout(currentPdfLayoutName);
    savableLayoutSettings.save();
    onClose();
  };

  return (
    <StudioModal
      isOpen={showConvertChoices}
      onClose={onClose}
      title={
        <Heading level={1} size='small'>
          {t('ux_editor.page_config_pdf_convert_page_to_pdf')}
        </Heading>
      }
      closeButtonLabel={t('ux_editor.page_config_pdf_abort_converting_page_to_pdf')}
    >
      <OverrideCurrentPdfByConversionChoices
        onConvertPageToPdfAndConvertCurrent={handleConvertPageToPdfAndConvertCurrent}
        onConvertPageToPdfAndDeleteCurrent={handleConvertPageToPdfAndDeleteCurrent}
      />
    </StudioModal>
  );
};
