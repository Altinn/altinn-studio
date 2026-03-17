import React from 'react';
import { ValidateNavigationConfig } from '../ValidateNavigationConfig';
import { Scope, convertToExternalConfig } from '../utils/ValidateNavigationUtils';
import type { InternalConfigState } from '../utils/ValidateNavigationTypes';
import { useConvertToInternalConfig } from '../utils/useConvertToInternalConfig';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useValidationOnNavigationGroupedSettingsQuery } from '@altinn/ux-editor/hooks/queries/useValidationOnNavigationGroupedSettingsQuery';
import { useUpdateValidationOnNavigationLayoutSettingsMutation } from '@altinn/ux-editor/hooks/mutations/useUpdateValidationOnNavigationLayoutSettingsMutation';

export const ValidateSelectedTasksConfig = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: settingsValidationData } = useValidationOnNavigationGroupedSettingsQuery(org, app);
  const { mutate: updateSettings } = useUpdateValidationOnNavigationLayoutSettingsMutation(
    org,
    app,
  );

  const internalConfigs = useConvertToInternalConfig(settingsValidationData ?? []);

  const handleSave = (updatedConfig: InternalConfigState, index?: number) => {
    const updatedInternalConfigs = [...internalConfigs];
    if (index !== undefined) {
      updatedInternalConfigs[index] = updatedConfig;
    } else {
      updatedInternalConfigs.push(updatedConfig);
    }

    updateSettings(updatedInternalConfigs.map(convertToExternalConfig));
  };

  const handleDelete = (index: number) => {
    const newIntConfigs = internalConfigs.filter((_, i) => i !== index);
    updateSettings(newIntConfigs.map(convertToExternalConfig));
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
