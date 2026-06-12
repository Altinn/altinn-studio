import { ValidateNavigationConfig } from '../ValidateNavigationConfig';
import { convertToExternalConfig, Scope } from '../utils/ValidateNavigationUtils';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { InternalConfigState } from '../utils/ValidateNavigationTypes';
import { useConvertToInternalConfig } from '../utils/useConvertToInternalConfig';
import { useSaveValidationOnNavigationLayoutSets } from '@altinn/ux-editor/hooks/mutations/useSaveValidationOnNavigationLayoutSets';
import { useDeleteValidationOnNavigationLayoutSets } from '@altinn/ux-editor/hooks/mutations/useDeleteValidationOnNavigationLayoutSets';
import { useValidationOnNavigationQuery } from '../../../../../hooks/queries/useValidationOnNavigationQuery';

export const ValidateAllTasksConfig = () => {
  const { org, app } = useStudioEnvironmentParams();

  const { data: externalConfig } = useValidationOnNavigationQuery(org, app);
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
