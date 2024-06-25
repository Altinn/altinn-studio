import React, { useState } from 'react';
import { StudioModal, StudioProperty } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { FileIcon } from '@studio/icons';
import { Alert, Combobox, Heading, Switch } from '@digdir/designsystemet-react';
import { usePdfLayoutName } from 'app-shared/hooks/usePdfLayoutName';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppContext, useFormLayouts } from '@altinn/ux-editor/hooks';
import { useFormLayoutSettingsQuery } from '@altinn/ux-editor/hooks/queries/useFormLayoutSettingsQuery';
import { useFormLayoutSettingsMutation } from '@altinn/ux-editor/hooks/mutations/useFormLayoutSettingsMutation';
import classes from './PdfConfig.module.css';
import type { IFormLayouts } from '@altinn/ux-editor/types/global';
import {
  getComponentIdsInCurrentLayout,
  getComponentsInCurrentLayoutToExcludeFromPdf,
  getRemainingComponentsToExcludeFromOtherLayouts,
  handleExcludeComponentsFromPdf,
  handleExcludePageFromPdf,
} from '@altinn/ux-editor/components/Properties/PageConfigPanel/PdfConfig/PdfConfigUtils';
import { useDeleteLayoutMutation } from '@altinn/ux-editor/hooks/mutations/useDeleteLayoutMutation';
import { OverrideCurrentPdfByConversionChoices } from './ConvertPageToPdf/OverrideCurrentPdfByConversionChoices';

export const PdfConfig = () => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName, selectedFormLayoutName } = useAppContext();
  const usePdfLayout = usePdfLayoutName(org, app, selectedFormLayoutSetName);
  // Maybe use a modal instead?
  const [showConvertChoices, setShowConvertChoices] = useState<boolean>(false);
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
  const layouts: IFormLayouts = useFormLayouts();

  const currentPageIsPdf: boolean = usePdfLayout === selectedFormLayoutName;
  const excludeCurrentPageFromPdf: boolean =
    formLayoutSettings?.pages?.excludeFromPdf?.includes(selectedFormLayoutName);
  const allComponentsToExcludeInPdf: string[] =
    formLayoutSettings?.components?.excludeFromPdf || [];
  const componentIdsInCurrentLayout: string[] = getComponentIdsInCurrentLayout(
    layouts,
    selectedFormLayoutName,
  );
  const componentsInCurrentLayoutToExcludeFromPdf = getComponentsInCurrentLayoutToExcludeFromPdf(
    componentIdsInCurrentLayout,
    allComponentsToExcludeInPdf,
  );
  const remainingComponentsToExcludeFromOtherLayouts =
    getRemainingComponentsToExcludeFromOtherLayouts(
      allComponentsToExcludeInPdf,
      componentIdsInCurrentLayout,
    );

  const { mutate: deleteLayout } = useDeleteLayoutMutation(org, app, selectedFormLayoutSetName);

  const handleClickConvertButton = () => {
    const pdfLayoutName = formLayoutSettings.pages.pdfLayoutName;
    if (pdfLayoutName) {
      setShowConvertChoices(true);
    } else {
      handleConvertPageToPdf();
    }
  };

  const handleConvertPageToPdfWhenExistingPdf = (deleteCurrent?: boolean) => {
    // Remove all layouts in exclude when setting a dedicated PDF or converting a current into PDF?
    const pdfLayoutName = formLayoutSettings.pages.pdfLayoutName;
    // Delete current pdfLayout if it exists. Should include a choice here to convert it back to regular layout or delete it
    if (deleteCurrent) {
      deleteLayout(pdfLayoutName);
    } else {
      formLayoutSettings.pages.order.push(pdfLayoutName);
    }
    handleConvertPageToPdf();
  };

  const handleConvertPageToPdf = () => {
    formLayoutSettings.pages.pdfLayoutName = selectedFormLayoutName;
    formLayoutSettings.pages.order.splice(
      formLayoutSettings.pages.order.indexOf(selectedFormLayoutName),
    );
    mutateFormLayoutSettings(formLayoutSettings);
  };

  const handleExcludePage = (checked: boolean) => {
    const updatedFormLayoutSettings = handleExcludePageFromPdf(
      formLayoutSettings,
      selectedFormLayoutName,
      remainingComponentsToExcludeFromOtherLayouts,
      allComponentsToExcludeInPdf,
      checked,
    );
    mutateFormLayoutSettings(updatedFormLayoutSettings);
  };

  const handleExcludeComponents = (componentsToExclude: string[]) => {
    const updatedFormLayoutSettings = handleExcludeComponentsFromPdf(
      formLayoutSettings,
      componentsToExclude,
      remainingComponentsToExcludeFromOtherLayouts,
      allComponentsToExcludeInPdf,
    );
    mutateFormLayoutSettings(updatedFormLayoutSettings);
  };

  return (
    <>
      {!currentPageIsPdf &&
        (showConvertChoices ? (
          <StudioModal
            isOpen={showConvertChoices}
            onClose={() => setShowConvertChoices(false)}
            title={
              <Heading level={1} size='small'>
                {t('ux_editor.page_config_pdf_convert_page_to_pdf')}
              </Heading>
            }
            closeButtonLabel={t('ux_editor.page_config_pdf_abort_converting_page_to_pdf')}
          >
            <OverrideCurrentPdfByConversionChoices
              onConvertPageToPdf={handleConvertPageToPdfWhenExistingPdf}
            />
          </StudioModal>
        ) : (
          <StudioProperty.Button
            onClick={handleClickConvertButton}
            property={t('ux_editor.page_config_pdf_convert_page_to_pdf')}
            size='small'
            icon={<FileIcon />}
          />
        ))}
      <div className={classes.convertToPdfButton}>
        <Switch
          onChange={({ target }) => handleExcludePage(target.checked)}
          size='small'
          checked={excludeCurrentPageFromPdf}
          disabled={!!usePdfLayout}
        >
          {t('ux_editor.page_config_pdf_exclude_page_from_default_pdf')}
        </Switch>
        {currentPageIsPdf && (
          <Alert>{t('ux_editor.page_config_pdf_current_page_is_pdf_info')}</Alert>
        )}
        {!usePdfLayout && (
          <Combobox
            className={classes.excludeComponents}
            size='small'
            label={t('ux_editor.page_config_pdf_exclude_components_from_default_pdf')}
            value={componentsInCurrentLayoutToExcludeFromPdf}
            onValueChange={(componentsToExclude: string[]) => {
              if (
                !(
                  componentsToExclude.every((comp) =>
                    componentsInCurrentLayoutToExcludeFromPdf.includes(comp),
                  ) &&
                  componentsToExclude.length === componentsInCurrentLayoutToExcludeFromPdf.length
                )
              )
                handleExcludeComponents(componentsToExclude);
            }}
            multiple
          >
            {componentIdsInCurrentLayout.map((componentId) => (
              <Combobox.Option
                key={componentId}
                value={componentId}
                description={componentId}
                displayValue={componentId}
              />
            ))}
          </Combobox>
        )}
      </div>
    </>
  );
};
