import React, { useMemo } from 'react';
import { ValidateNavigationConfig } from '../ValidateNavigationConfig';
import {
  Scope,
  convertInternalToExternalConfig,
  convertExternalToBackendSetting,
  convertBackendToExternalConfig,
  withUniqueIds,
} from '../utils/ValidateNavigationUtils';
import type { ExternalConfigWithId, InternalConfigState } from '../utils/ValidateNavigationTypes';
import { useConvertToInternalConfig } from '../utils/useConvertToInternalConfig';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useValidationOnNavigationGroupedSettingsQuery } from '@altinn/ux-editor/hooks/queries/useValidationOnNavigationGroupedSettingsQuery';
import { useUpdateValidationOnNavigationLayoutSettingsMutation } from '@altinn/ux-editor/hooks/mutations/useUpdateValidationOnNavigationLayoutSettingsMutation';

export const ValidateSelectedTasksConfig = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: settings } = useValidationOnNavigationGroupedSettingsQuery(org, app);
  const { mutate: updateSettings } = useUpdateValidationOnNavigationLayoutSettingsMutation(
    org,
    app,
  );

  const extConfigs = useMemo<ExternalConfigWithId[]>(
    () => withUniqueIds((settings ?? []).map(convertBackendToExternalConfig)),
    [settings],
  );

  const internalConfigs = useConvertToInternalConfig(extConfigs)?.map((conf, i) => ({
    ...conf,
    id: extConfigs[i].id,
  }));

  const handleSave = (updatedConfig: InternalConfigState, id?: string) => {
    const newExternal = convertInternalToExternalConfig(updatedConfig);
    const newExtConfigs: ExternalConfigWithId[] = id
      ? extConfigs.map((config) => (config.id === id ? { ...newExternal, id } : config))
      : [...extConfigs, { ...newExternal, id: crypto.randomUUID() }];
    updateSettings(newExtConfigs.map(convertExternalToBackendSetting));
  };

  const handleDelete = (id: string) => {
    const newExtConfigs = extConfigs.filter((config) => config.id !== id);
    updateSettings(newExtConfigs.map(convertExternalToBackendSetting));
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
