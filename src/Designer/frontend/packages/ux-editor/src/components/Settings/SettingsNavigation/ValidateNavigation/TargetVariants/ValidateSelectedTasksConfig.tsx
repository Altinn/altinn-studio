import { ValidateNavigationConfig } from '../ValidateNavigationConfig';
import { Scope, convertToExternalConfig } from '../utils/ValidateNavigationUtils';
import type { InternalConfigState } from '../utils/ValidateNavigationTypes';
import { useConvertToInternalConfig } from '../utils/useConvertToInternalConfig';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { ValidationOnNavigationLevel } from 'app-shared/types/global';
import { useValidationOnNavigationQuery } from '../../../../../hooks/queries/useValidationOnNavigationQuery';
import { useValidationOnNavigationMutation } from '../../../../../hooks/mutations/useValidationOnNavigationMutation';

export const ValidateSelectedTasksConfig = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: settingsValidationData } = useValidationOnNavigationQuery(
    org,
    app,
    ValidationOnNavigationLevel.LayoutSets,
  );
  const { mutate: saveSettings } = useValidationOnNavigationMutation(
    org,
    app,
    ValidationOnNavigationLevel.LayoutSets,
  );

  const internalConfigs = useConvertToInternalConfig(settingsValidationData ?? []);

  const handleSave = (updatedConfig: InternalConfigState, index?: number) => {
    const updatedInternalConfigs = [...internalConfigs];
    if (index !== undefined) {
      updatedInternalConfigs[index] = updatedConfig;
    } else {
      updatedInternalConfigs.push(updatedConfig);
    }
    saveSettings(updatedInternalConfigs.map(convertToExternalConfig));
  };

  const handleDelete = (index: number) => {
    const remainingConfigs = internalConfigs.filter((_, i) => i !== index);
    saveSettings(remainingConfigs.map(convertToExternalConfig));
  };

  return (
    <>
      {internalConfigs.map((conf, index) => (
        <ValidateNavigationConfig
          key={index}
          scope={Scope.SelectedTasks}
          config={conf}
          existingConfigs={internalConfigs}
          onSave={(newConf) => handleSave(newConf, index)}
          onDelete={() => handleDelete(index)}
        />
      ))}
      <ValidateNavigationConfig
        scope={Scope.SelectedTasks}
        existingConfigs={internalConfigs}
        onSave={(newConf) => handleSave(newConf)}
      />
    </>
  );
};
