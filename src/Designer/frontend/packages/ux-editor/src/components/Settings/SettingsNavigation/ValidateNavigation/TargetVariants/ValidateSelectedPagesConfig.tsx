import React, { useState, useEffect } from 'react';
import { ValidateNavigationConfig } from '../ValidateNavigationConfig';
import { Scope, convertToExternalConfig, dummyDataPages } from '../utils/ValidateNavigationUtils';
import type { ExternalConfigState, InternalConfigState } from '../utils/ValidateNavigationTypes';
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
  const [tempExtConfigs, setTempExtConfigs] = useState<ExternalConfigState[]>(dummyDataPages);

  const internalConfigs = useConvertToInternalConfig(tempExtConfigs);
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

  const handleSave = (updatedConfig: InternalConfigState, index?: number) => {
    const updatedInternalConfigs = [...internalConfigs];
    if (index !== undefined) {
      updatedInternalConfigs[index] = updatedConfig;
    } else {
      updatedInternalConfigs.push(updatedConfig);
    }

    const newExternal = updatedInternalConfigs.map(convertToExternalConfig);
    setTempExtConfigs(newExternal);
  };

  const handleDelete = (index: number) => {
    const newIntConfigs = internalConfigs.filter((_, i) => i !== index);
    setTempExtConfigs(newIntConfigs.map(convertToExternalConfig));
  };

  return (
    <>
      {internalConfigs?.map((conf, index) => (
        <ValidateNavigationConfig
          key={index}
          scope={Scope.SelectedPages}
          config={conf}
          existingConfigs={internalConfigs}
          onSave={(newConf) => handleSave(newConf, index)}
          onDelete={() => handleDelete(index)}
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
