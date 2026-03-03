import React, { useState, useEffect } from 'react';
import { ValidateNavigationConfig } from '../ValidateNavigationConfig';
import { Scope, convertToExternalConfig, withUniqueIds } from '../utils/ValidateNavigationUtils';
import type {
  ExternalConfigWithId,
  ExternalConfigState,
  InternalConfigState,
} from '../utils/ValidateNavigationTypes';
import { useConvertToInternalConfig } from '../utils/useConvertToInternalConfig';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useValidationOnNavigationPageSettingsQuery } from '@altinn/ux-editor/hooks/queries/usePageValidationOnNavigationLayoutSettingsQuery';
import { useValidationOnNavigationPageSettingsMutation } from '@altinn/ux-editor/hooks/mutations/useValidationOnNavigationPageSettingsMutation';
import type { IValidationOnNavigationPageSettings } from 'app-shared/types/global';

const toExternalConfig = (setting: IValidationOnNavigationPageSettings): ExternalConfigState => ({
  show: setting.show ?? [],
  page: setting.page ?? '',
  task: setting.task,
  pages: setting.pages,
});

const toPageSettings = (config: ExternalConfigWithId): IValidationOnNavigationPageSettings => ({
  task: config.task,
  pages: config.pages ?? [],
  show: config.show.length > 0 ? config.show : undefined,
  page: config.page || undefined,
});

export const ValidateSelectedPagesConfig = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: pageValidationData } = useValidationOnNavigationPageSettingsQuery(org, app);
  const { mutate } = useValidationOnNavigationPageSettingsMutation(org, app);
  const [tempExtConfigs, setTempExtConfigs] = useState<ExternalConfigWithId[]>([]);

  useEffect(() => {
    if (pageValidationData) {
      setTempExtConfigs(withUniqueIds(pageValidationData.map(toExternalConfig)));
    }
  }, [pageValidationData]);

  const internalConfigs = useConvertToInternalConfig(tempExtConfigs)?.map((conf, i) => ({
    ...conf,
    id: tempExtConfigs[i].id,
  }));

  const handleSave = (updatedConfig: InternalConfigState, id?: string) => {
    const newExternal = convertToExternalConfig(updatedConfig);
    const newConfigs = id
      ? tempExtConfigs.map((config) => (config.id === id ? { ...newExternal, id } : config))
      : [...tempExtConfigs, { ...newExternal, id: crypto.randomUUID() }];

    setTempExtConfigs(newConfigs);
    mutate(newConfigs.map(toPageSettings));
  };

  const handleDelete = (id: string) => {
    const newConfigs = tempExtConfigs.filter((config) => config.id !== id);
    setTempExtConfigs(newConfigs);
    mutate(newConfigs.map(toPageSettings));
  };

  return (
    <>
      {internalConfigs?.map((conf) => (
        <ValidateNavigationConfig
          key={conf.id}
          scope={Scope.SelectedPages}
          config={conf}
          existingConfigs={internalConfigs}
          onSave={(newConf) => handleSave(newConf, conf.id)}
          onDelete={() => handleDelete(conf.id)}
        />
      ))}
      <ValidateNavigationConfig
        scope={Scope.SelectedPages}
        existingConfigs={internalConfigs}
        onSave={(newConf) => handleSave(newConf)}
      />
    </>
  );
};
