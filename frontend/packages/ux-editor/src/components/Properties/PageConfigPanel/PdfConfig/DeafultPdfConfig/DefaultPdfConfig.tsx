import React from 'react';
import { ExcludeComponents } from './ExcludeComponents';
import { Switch } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';
import { usePdf } from '@altinn/ux-editor/hooks/usePdf/usePdf';
import { useFormLayoutSettingsMutation } from '@altinn/ux-editor/hooks/mutations/useFormLayoutSettingsMutation';
import { useFormLayoutSettingsQuery } from '@altinn/ux-editor/hooks/queries/useFormLayoutSettingsQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppContext } from '@altinn/ux-editor/hooks';

export const DefaultPdfConfig = () => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName } = useAppContext();
  const {
    pdfLayoutName,
    currentPageIsExcludedFromPdf,
    setPageAsExcludeFromPdf,
    unsetPageFromExcludeFromPdf,
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

  const handleExcludePageFromPdf = (exclude: boolean) => {
    if (exclude) setPageAsExcludeFromPdf(formLayoutSettings);
    else {
      unsetPageFromExcludeFromPdf(formLayoutSettings);
    }
    mutateFormLayoutSettings(formLayoutSettings);
  };

  return (
    <>
      <Switch
        onChange={({ target }) => handleExcludePageFromPdf(target.checked)}
        size='small'
        checked={currentPageIsExcludedFromPdf}
        disabled={!!pdfLayoutName}
      >
        {t('ux_editor.page_config_pdf_exclude_page_from_default_pdf')}
      </Switch>
      {!pdfLayoutName && <ExcludeComponents />}
    </>
  );
};
