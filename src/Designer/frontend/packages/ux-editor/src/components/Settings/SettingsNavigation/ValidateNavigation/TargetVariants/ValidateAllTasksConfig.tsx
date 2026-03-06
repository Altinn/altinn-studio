import React from 'react';
import { ValidateNavigationConfig } from '../ValidateNavigationConfig';
import { convertInternalToExternalConfig, Scope } from '../utils/ValidateNavigationUtils';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { InternalConfigState } from '../utils/ValidateNavigationTypes';
import { useConvertToInternalConfig } from '../utils/useConvertToInternalConfig';
import { useSaveValidationOnNavigationLayoutSets } from '@altinn/ux-editor/hooks/mutations/useSaveValidationOnNavigationLayoutSets';
import { useDeleteValidationOnNavigationLayoutSets } from '@altinn/ux-editor/hooks/mutations/useDeleteValidationOnNavigationLayoutSets';
import { useValidationOnNavigationLayoutSetsQuery } from '@altinn/ux-editor/hooks/queries/useValidationOnNavigationLayoutSetsQuery';

export const ValidateAllTasksConfig = () => {
  const { org, app } = useStudioEnvironmentParams();

  const { data: externalConfig } = useValidationOnNavigationLayoutSetsQuery(org, app);
  const { mutate: updateExternalConfig } = useSaveValidationOnNavigationLayoutSets(org, app);
  const { mutate: deleteExternalConfig } = useDeleteValidationOnNavigationLayoutSets(org, app);

  const internalConfig = useConvertToInternalConfig(externalConfig);
  const handleSave = (updatedConfig: InternalConfigState) => {
    updateExternalConfig(convertToExternalConfig(updatedConfig));
  };

  const handleDelete = () => {
    deleteExternalConfig();
  };

  return (
    <ValidateNavigationConfig
      scope={Scope.AllTasks}
      config={internalConfig}
      onSave={handleSave}
      onDelete={handleDelete}
    />
  );
};
