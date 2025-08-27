import React, { forwardRef } from 'react';
import { StudioModal } from '@studio/components-legacy';
import { useForwardedRef } from '@studio/hooks';
import { OverrideCurrentPdfByConversionChoices } from './OverrideCurrentPdfByConversionChoices';
import { useTranslation } from 'react-i18next';
import { usePdf } from '@altinn/ux-editor/hooks/usePdf/usePdf';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppContext } from '@altinn/ux-editor/hooks';
import { useDeleteLayoutMutation } from '@altinn/ux-editor/hooks/mutations/useDeleteLayoutMutation';
import { useSavableFormLayoutSettings } from '@altinn/ux-editor/hooks/useSavableFormLayoutSettings';

type ConvertChoicesModalProps = {
  handleModalAction: () => void;
};
export const ConvertChoicesModal = forwardRef<HTMLDialogElement, ConvertChoicesModalProps>(
  ({ handleModalAction }, ref): JSX.Element => {
    const { org, app } = useStudioEnvironmentParams();
    const { selectedFormLayoutSetName } = useAppContext();
    const { t } = useTranslation();
    const { mutate: deleteLayout } = useDeleteLayoutMutation(org, app, selectedFormLayoutSetName);
    const { getPdfLayoutName, convertCurrentPageToPdf, convertExistingPdfToPage } = usePdf();
    const savableLayoutSettings = useSavableFormLayoutSettings();
    const dialogRef = useForwardedRef<HTMLDialogElement>(ref);

    const handleConvertPageToPdfAndConvertCurrent = () => {
      convertExistingPdfToPage();
      convertCurrentPageToPdf();
      savableLayoutSettings.save();
      handleModalAction();
      dialogRef.current?.close();
    };

    const handleConvertPageToPdfAndDeleteCurrent = () => {
      const currentPdfLayoutName = getPdfLayoutName();
      convertCurrentPageToPdf();
      deleteLayout(currentPdfLayoutName);
      savableLayoutSettings.save();
      handleModalAction();
      dialogRef.current?.close();
    };

    return (
      <StudioModal.Dialog
        closeButtonTitle={t('ux_editor.page_config_pdf_abort_converting_page_to_pdf')}
        heading={t('ux_editor.page_config_pdf_convert_page_to_pdf')}
        ref={dialogRef}
      >
        <OverrideCurrentPdfByConversionChoices
          onConvertPageToPdfAndConvertCurrent={handleConvertPageToPdfAndConvertCurrent}
          onConvertPageToPdfAndDeleteCurrent={handleConvertPageToPdfAndDeleteCurrent}
        />
      </StudioModal.Dialog>
    );
  },
);

ConvertChoicesModal.displayName = 'ConvertChoicesModal';
