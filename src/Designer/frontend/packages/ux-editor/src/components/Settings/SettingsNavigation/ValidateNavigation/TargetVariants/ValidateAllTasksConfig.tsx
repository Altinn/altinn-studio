import React, { useState } from 'react';
import { ValidateNavigationConfig } from '../ValidateNavigationConfig';
import { convertToExternalConfig, Scope } from '../utils/ValidateNavigationUtils';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import type { InternalConfigState } from '../utils/ValidateNavigationTypes';
import { useConvertToInternalConfig } from '../utils/useConvertToInternalConfig';
import { useValidationOnNavigationLayoutSetsMutation } from '@altinn/ux-editor/hooks/mutations/useValidationOnNavigationLayoutSetsMutation';

export const ValidateAllTasksConfig = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: layoutSetsSchema } = useLayoutSetsQuery(org, app);
  const configData = layoutSetsSchema?.validationOnNavigation;
  const [tempExtConfig, setTempExtConfig] = useState(configData); // This is just to simulate the save functionality, in real implementation this would be handled differently
  const config = useConvertToInternalConfig(tempExtConfig);
  const { mutate: updateLayoutSets } = useValidationOnNavigationLayoutSetsMutation(org, app);
  const handleSave = (updatedConfig: InternalConfigState) => {
    setTempExtConfig(convertToExternalConfig(updatedConfig));
  };

  const handleDelete = () => {
    updateLayoutSets(null);
    setTempExtConfig(undefined); // This is just to simulate the delete functionality, in real implementation this would be handled differently
  };

  return (
    <ValidateNavigationConfig
      scope={Scope.AllTasks}
      config={config}
      onSave={handleSave}
      onDelete={handleDelete}
    />
  );
};
