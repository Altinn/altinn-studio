import React, { useState } from 'react';
import { StudioButton, StudioProperty } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { FileIcon } from '@studio/icons';
import { Alert } from '@digdir/designsystemet-react';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppContext } from '../../../../hooks';
import { useFormLayoutSettingsMutation } from '../../../../hooks/mutations/useFormLayoutSettingsMutation';
import { usePdf } from '../../../../hooks/usePdf/usePdf';
import { DefaultPdfConfig } from './DeafultPdfConfig/DefaultPdfConfig';
import { ConvertChoicesModal } from './ConvertPageToPdfWhenExistingModal/ConvertChoicesModal';
import { useFormLayoutSettingsQuery } from '../../../../hooks/queries/useFormLayoutSettingsQuery';
import { ObjectUtils } from '@studio/pure-functions';

export const PdfConfig = () => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName, selectedFormLayoutName } = useAppContext();
  const [showConvertChoices, setShowConvertChoices] = useState<boolean>(false);
  const {
    pdfLayoutName,
    currentPageIsPdf,
    deletePdfFromSettings,
    addLayoutToPages,
    convertCurrentPageToPdf,
  } = usePdf();
  const { mutate: mutateFormLayoutSettings } = useFormLayoutSettingsMutation(
    org,
    app,
    selectedFormLayoutSetName,
  );
  const { data: formLayoutSettings } = useFormLayoutSettingsQuery(
    org,
    app,
    selectedFormLayoutSetName,
  );

  const handleClickConvertButton = () => {
    if (pdfLayoutName) {
      setShowConvertChoices(true);
    } else {
      const formLayoutSettingsCopy = ObjectUtils.deepCopy(formLayoutSettings);
      const updateLayoutSettings = convertCurrentPageToPdf(formLayoutSettingsCopy);
      mutateFormLayoutSettings(updateLayoutSettings);
    }
  };

  const handleConvertExistingPdfToFormLayout = () => {
    const formLayoutSettingsCopy = ObjectUtils.deepCopy(formLayoutSettings);
    const layoutSettingsDeletedPdf = deletePdfFromSettings(formLayoutSettingsCopy);
    const layoutSettingsPdfAddedToPages = addLayoutToPages(
      layoutSettingsDeletedPdf,
      selectedFormLayoutName,
    );
    mutateFormLayoutSettings(layoutSettingsPdfAddedToPages);
  };

  return (
    <>
      {
        showConvertChoices && (
          <ConvertChoicesModal
            showConvertChoices={showConvertChoices}
            onSetShowConvertChoices={setShowConvertChoices}
          />
        ) // Use confirm dialog
      }
      {currentPageIsPdf ? (
        <>
          <StudioButton size='small' onClick={handleConvertExistingPdfToFormLayout}>
            {t('ux_editor.page_config_pdf_convert_existing_pdf')}
          </StudioButton>
          <Alert size='small'>{t('ux_editor.page_config_pdf_current_page_is_pdf_info')}</Alert>
        </>
      ) : (
        <StudioProperty.Button
          onClick={handleClickConvertButton}
          property={t('ux_editor.page_config_pdf_convert_page_to_pdf')}
          size='small'
          icon={<FileIcon />}
        />
      )}
      <DefaultPdfConfig />
    </>
  );
};
