import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ValidateNavigationConfig } from '../ValidateNavigationConfig';
import { convertToExternalConfig, Scope } from '../utils/ValidateNavigationUtils';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import type { InternalConfigState } from '../utils/ValidateNavigationTypes';
import { useConvertToInternalConfig } from '../utils/useConvertToInternalConfig';

export const ValidateAllTasksConfig = () => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: layoutSetsSchema } = useLayoutSetsQuery(org, app);
  const configData = layoutSetsSchema?.validationOnNavigation;
  const [tempExtConfig, setTempExtConfig] = useState(configData); // This is just to simulate the save functionality, in real implementation this would be handled differently
  const config = useConvertToInternalConfig(tempExtConfig);

  const handleSave = (updatedConfig: InternalConfigState) => {
    setTempExtConfig(convertToExternalConfig(updatedConfig));
  };

  const handleDelete = () => {
    setTempExtConfig(undefined); // This is just to simulate the delete functionality, in real implementation this would be handled differently
  };

  return (
    <ValidateNavigationConfig
      propertyLabel={t('ux_editor.settings.navigation_validation_button_label')}
      scope={Scope.AllTasks}
      config={config}
      onSave={handleSave}
      onDelete={handleDelete}
    />
  );
};
