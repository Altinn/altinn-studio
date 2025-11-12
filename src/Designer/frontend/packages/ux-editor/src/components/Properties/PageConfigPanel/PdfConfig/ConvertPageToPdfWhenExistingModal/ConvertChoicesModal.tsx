import React, { forwardRef } from 'react';
import { StudioDialog, StudioHeading } from '@studio/components';
import { useForwardedRef } from '@studio/hooks';
import { OverrideCurrentPdfByConversionChoices } from './OverrideCurrentPdfByConversionChoices';
import { useTranslation } from 'react-i18next';
import { usePdf } from '@altinn/ux-editor/hooks/usePdf/usePdf';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useDeleteLayoutMutation } from '@altinn/ux-editor/hooks/mutations/useDeleteLayoutMutation';
import { useSavableFormLayoutSettings } from '@altinn/ux-editor/hooks/useSavableFormLayoutSettings';
import useUxEditorParams from '@altinn/ux-editor/hooks/useUxEditorParams';

type ConvertChoicesModalProps = {
  handleModalAction: () => void;
};
export const ConvertChoicesModal = forwardRef<HTMLDialogElement, ConvertChoicesModalProps>(
  ({ handleModalAction }, ref): JSX.Element => {
    const { org, app } = useStudioEnvironmentParams();
    const { layoutSet } = useUxEditorParams();
    const { t } = useTranslation();
    const { mutate: deleteLayout } = useDeleteLayoutMutation(org, app, layoutSet);
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
      <StudioDialog ref={dialogRef}>
        <StudioDialog.Block>
          <StudioHeading level={2}>
            {t('ux_editor.page_config_pdf_convert_page_to_pdf')}
          </StudioHeading>
        </StudioDialog.Block>
        <StudioDialog.Block>
          <OverrideCurrentPdfByConversionChoices
            onConvertPageToPdfAndConvertCurrent={handleConvertPageToPdfAndConvertCurrent}
            onConvertPageToPdfAndDeleteCurrent={handleConvertPageToPdfAndDeleteCurrent}
          />
        </StudioDialog.Block>
      </StudioDialog>
    );
  },
);

ConvertChoicesModal.displayName = 'ConvertChoicesModal';
