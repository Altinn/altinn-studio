import React from 'react';
import { ValidateNavigationConfig } from '../ValidateNavigationConfig';
import { Scope, convertToExternalConfig } from '../utils/ValidateNavigationUtils';
import type { InternalConfigState } from '../utils/ValidateNavigationTypes';
import { useConvertToInternalConfig } from '../utils/useConvertToInternalConfig';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useValidationOnNavigationGroupedSettingsQuery } from '@altinn/ux-editor/hooks/queries/useValidationOnNavigationGroupedSettingsQuery';
import { useUpdateValidationOnNavigationLayoutSettingsMutation } from '@altinn/ux-editor/hooks/mutations/useUpdateValidationOnNavigationLayoutSettingsMutation';
import type { IValidationOnNavigationLayoutSettings } from 'app-shared/types/global';

export const ValidateSelectedTasksConfig = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: settings } = useValidationOnNavigationGroupedSettingsQuery(org, app);
  const { mutate: updateSettings } = useUpdateValidationOnNavigationLayoutSettingsMutation(
    org,
    app,
  );

  const extConfigs: (IValidationOnNavigationLayoutSettings & { id: string })[] = (
    settings ?? []
  ).map((setting) => ({ ...setting, id: crypto.randomUUID() }));

  const internalConfigs = useConvertToInternalConfig(settings ?? []).map((conf, i) => ({
    ...conf,
    id: extConfigs[i].id,
  }));

  const handleSave = (updatedConfig: InternalConfigState, id?: string) => {
    const internalConfig: InternalConfigState[] = id
      ? internalConfigs.map((config) => (config.id === id ? { ...updatedConfig, id } : config))
      : [...internalConfigs, { ...updatedConfig, id: crypto.randomUUID() }];

    const newExternal = internalConfig.map(convertToExternalConfig);

    updateSettings(newExternal);
  };

  const handleDelete = (id: string) => {
    // const newExtConfigs = extConfigs.filter((config) => config.id !== id);
    const newIntConfigs = internalConfigs.filter((config) => config.id !== id);
    updateSettings(newIntConfigs.map(convertToExternalConfig));
  };

  return (
    <>
      {internalConfigs &&
        internalConfigs.map((conf) => (
          <ValidateNavigationConfig
            key={conf.id}
            scope={Scope.SelectedTasks}
            config={conf}
            existingConfigs={internalConfigs}
            onSave={(newConf) => handleSave(newConf, conf.id)}
            onDelete={() => handleDelete(conf.id)}
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
