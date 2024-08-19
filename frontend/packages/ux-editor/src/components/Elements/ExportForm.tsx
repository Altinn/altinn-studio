import React from 'react';
import { StudioButton } from '@studio/components';
import { useAppContext } from '../../hooks';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useFormLayoutsQuery } from '../../hooks/queries/useFormLayoutsQuery';
import { useOptionListsQuery } from '../../hooks/queries/useOptionListsQuery';
import { useTextResourcesQuery } from 'app-shared/hooks/queries';
import { generateExportFormFormat } from '../../utils/exportUtils';
import { useFormLayoutSettingsQuery } from '@altinn/ux-editor/hooks/queries/useFormLayoutSettingsQuery';

export const ExportForm = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName } = useAppContext();
  const { data: formLayouts } = useFormLayoutsQuery(org, app, selectedFormLayoutSetName);
  const { data: optionLists } = useOptionListsQuery(org, app);

  const { data: textResources } = useTextResourcesQuery(org, app);
  const { data: settings } = useFormLayoutSettingsQuery(org, app, selectedFormLayoutSetName);

  const handleExportClick = () => {
    if (formLayouts && textResources) {
      const exportFormat = generateExportFormFormat(
        settings?.pages?.order,
        formLayouts,
        selectedFormLayoutSetName,
        app,
        textResources,
        optionLists,
        'nb',
        false,
      );
      const blob = new Blob([JSON.stringify(exportFormat)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedFormLayoutSetName}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <StudioButton onClick={handleExportClick} variant='tertiary'>
      Eksporter skjemadefinisjon
    </StudioButton>
  );
};
