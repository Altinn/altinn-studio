import React from 'react';
import { StudioModal } from '@studio/components';
import { OverrideCurrentPdfByConversionChoices } from './OverrideCurrentPdfByConversionChoices';
import { Heading } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';
import { usePdf } from '@altinn/ux-editor/hooks/usePdf/usePdf';
import { useFormLayoutSettingsMutation } from '@altinn/ux-editor/hooks/mutations/useFormLayoutSettingsMutation';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppContext } from '@altinn/ux-editor/hooks';
import { useDeleteLayoutMutation } from '@altinn/ux-editor/hooks/mutations/useDeleteLayoutMutation';
import { useFormLayoutSettingsQuery } from '@altinn/ux-editor/hooks/queries/useFormLayoutSettingsQuery';

type ConvertChoicesModalProps = {
  showConvertChoices: boolean;
  onSetShowConvertChoices: (showChoices: boolean) => void;
};
export const ConvertChoicesModal = ({
  showConvertChoices,
  onSetShowConvertChoices,
}: ConvertChoicesModalProps) => {
  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName, selectedFormLayoutName } = useAppContext();
  const { t } = useTranslation();
  const { convertCurrentPageToPdf } = usePdf();
  const { data: formLayoutSettings } = useFormLayoutSettingsQuery(
    org,
    app,
    selectedFormLayoutSetName,
  );
  const { mutate: mutateFormLayoutSettings } = useFormLayoutSettingsMutation(
    org,
    app,
    selectedFormLayoutSetName,
  );
  const { mutate: deleteLayout } = useDeleteLayoutMutation(org, app, selectedFormLayoutSetName);

  const handleConvertPageToPdfAndConvertCurrent = () => {
    const updatedLayoutSetting = convertCurrentPageToPdf(formLayoutSettings);
    mutateFormLayoutSettings(updatedLayoutSetting);
  };

  const handleConvertPageToPdfAndDeleteCurrent = () => {
    const updatedLayoutSetting = convertCurrentPageToPdf(formLayoutSettings);
    deleteLayout(selectedFormLayoutName);
    mutateFormLayoutSettings(updatedLayoutSetting);
  };

  return (
    <StudioModal
      isOpen={showConvertChoices}
      onClose={() => onSetShowConvertChoices(false)}
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
