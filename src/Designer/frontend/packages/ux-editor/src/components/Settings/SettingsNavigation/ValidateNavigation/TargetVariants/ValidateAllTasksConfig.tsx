import { ValidateNavigationConfig } from '../ValidateNavigationConfig';
import { convertToExternalConfig, Scope } from '../utils/ValidateNavigationUtils';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { InternalConfigState } from '../utils/ValidateNavigationTypes';
import { useConvertToInternalConfig } from '../utils/useConvertToInternalConfig';
import { useValidationOnNavigationQuery } from '../../../../../hooks/queries/useValidationOnNavigationQuery';
import { useValidationOnNavigationMutation } from '../../../../../hooks/mutations/useValidationOnNavigationMutation';

export const ValidateAllTasksConfig = () => {
  const { org, app } = useStudioEnvironmentParams();

  const { data: externalConfig } = useValidationOnNavigationQuery(org, app);
  const { mutate: updateExternalConfig } = useValidationOnNavigationMutation(org, app);

  const internalConfig = useConvertToInternalConfig(externalConfig);
  const handleSave = (updatedConfig: InternalConfigState) => {
    updateExternalConfig(convertToExternalConfig(updatedConfig));
  };

  const handleDelete = () => {
    updateExternalConfig({});
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
