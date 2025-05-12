import React, { useEffect, useMemo } from 'react';
import { StudioBlobDownloader } from '@studio/components-legacy';
import { useAppContext } from '../../../hooks';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useFormLayoutsQuery } from '../../../hooks/queries/useFormLayoutsQuery';
import { useTextResourcesQuery, useOptionListsQuery } from 'app-shared/hooks/queries';
import { ExportUtils } from '../../../utils/exportUtils';
import { useFormLayoutSettingsQuery } from '@altinn/ux-editor/hooks/queries/useFormLayoutSettingsQuery';
import type { ExportForm as ExportFormType } from '../../../types/ExportForm';
import { useTranslation } from 'react-i18next';

export const ExportForm = () => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName } = useAppContext();
  const { data: formLayouts } = useFormLayoutsQuery(org, app, selectedFormLayoutSetName);
  const { data: optionListsData } = useOptionListsQuery(org, app);

  const { data: textResources } = useTextResourcesQuery(org, app);
  const { data: settings } = useFormLayoutSettingsQuery(org, app, selectedFormLayoutSetName);

  const exportUtils = useMemo(
    () =>
      new ExportUtils(
        settings?.pages?.order,
        formLayouts,
        selectedFormLayoutSetName,
        app,
        textResources,
        optionListsData,
        'nb',
        false,
      ),
    [formLayouts, textResources, settings, selectedFormLayoutSetName, app, optionListsData],
  );

  const [exportFormat, setExportFormat] = React.useState<ExportFormType>({
    appId: '',
    formId: '',
    pages: [],
  });

  useEffect(() => {
    if (formLayouts && textResources) {
      const generatedExportFormat = exportUtils.generateExportFormFormat();
      setExportFormat(generatedExportFormat);
    }
  }, [formLayouts, textResources, exportUtils]);

  return (
    <StudioBlobDownloader
      fileName={`${selectedFormLayoutSetName}.json`}
      fileType='application/json'
      linkText={t('ux_editor.top_bar.export_form')}
      data={JSON.stringify(exportFormat)}
    />
  );
};
