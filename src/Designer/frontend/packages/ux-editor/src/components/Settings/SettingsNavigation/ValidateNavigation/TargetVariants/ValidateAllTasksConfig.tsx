import { ValidateNavigationConfig } from '../ValidateNavigationConfig';
import { convertToExternalConfig, Scope } from '../utils/ValidateNavigationUtils';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { InternalConfigState } from '../utils/ValidateNavigationTypes';
import { useConvertToInternalConfig } from '../utils/useConvertToInternalConfig';
import { useGlobalValidationOnNavigationQuery } from '@altinn/ux-editor/hooks/queries/useGlobalValidationOnNavigationQuery';
import { useSaveGlobalValidationOnNavigation } from '@altinn/ux-editor/hooks/mutations/useSaveGlobalValidationOnNavigation';
import { useDeleteGlobalValidationOnNavigation } from '@altinn/ux-editor/hooks/mutations/useDeleteGlobalValidationOnNavigation';

export const ValidateAllTasksConfig = () => {
  const { org, app } = useStudioEnvironmentParams();

  const { data: externalConfig } = useGlobalValidationOnNavigationQuery(org, app);
  const { mutate: updateExternalConfig } = useSaveGlobalValidationOnNavigation(org, app);
  const { mutate: deleteExternalConfig } = useDeleteGlobalValidationOnNavigation(org, app);

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
