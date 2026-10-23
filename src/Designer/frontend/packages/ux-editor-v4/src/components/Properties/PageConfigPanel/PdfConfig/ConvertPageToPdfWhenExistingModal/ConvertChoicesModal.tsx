import { forwardRef, type JSX } from 'react';
import { StudioDialog, StudioHeading } from '@studio/components';
import { useForwardedRef } from '@studio/hooks';
import { OverrideCurrentPdfByConversionChoices } from './OverrideCurrentPdfByConversionChoices';
import { useTranslation } from 'react-i18next';
import { usePdf } from '@altinn/ux-editor-v4/hooks/usePdf/usePdf';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useDeletePageMutation } from '@altinn/ux-editor-v4/hooks/mutations/useDeletePageMutation';
import { useSavableFormLayoutSettings } from '@altinn/ux-editor-v4/hooks/useSavableFormLayoutSettings';
import useUxEditorParams from '@altinn/ux-editor-v4/hooks/useUxEditorParams';

type ConvertChoicesModalProps = {
  handleModalAction: () => void;
};
export const ConvertChoicesModal = forwardRef<HTMLDialogElement, ConvertChoicesModalProps>(
  ({ handleModalAction }, ref): JSX.Element => {
    const { org, app } = useStudioEnvironmentParams();
    const { layoutSet } = useUxEditorParams();
    const { t } = useTranslation();
    const { mutateAsync: deletePage } = useDeletePageMutation(org, app, layoutSet);
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

    const handleConvertPageToPdfAndDeleteCurrent = async () => {
      dialogRef.current?.close();
      // The server deletes a page only while the settings name it, so the current PDF page is
      // deleted before this page takes its place.
      await deletePage(getPdfLayoutName());
      convertCurrentPageToPdf();
      savableLayoutSettings.save();
      handleModalAction();
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
