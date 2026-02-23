import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ValidateNavigationConfig } from '../ValidateNavigationConfig';
import { Scope, convertToExternalConfig, withUniqueIds } from '../utils/ValidateNavigationUtils';
import type {
  ExternalConfigState,
  ExternalConfigWithId,
  InternalConfigState,
} from '../utils/ValidateNavigationTypes';
import { useConvertToInternalConfig } from '../utils/useConvertToInternalConfig';

export const ValidateSelectedPagesConfig = () => {
  const { t } = useTranslation();

  const dummyData: ExternalConfigState[] = [
    {
      show: ['Schema', 'Component'],
      page: 'current',
      task: 'oppgave1',
      pages: ['page1', 'page2'],
    },
    {
      show: ['Schema'],
      page: 'currentAndPrevious',
      task: 'oppgave2',
      pages: ['page3'],
    },
  ];

  const [tempExtConfigs, setTempExtConfigs] = useState<ExternalConfigWithId[]>(
    withUniqueIds(dummyData),
  );
  const internalConfigs = useConvertToInternalConfig(tempExtConfigs)?.map((conf, i) => ({
    ...conf,
    id: tempExtConfigs[i].id,
  }));

  const handleSave = (updatedConfig: InternalConfigState, id?: string) => {
    const newExternal = convertToExternalConfig(updatedConfig);

    setTempExtConfigs((prevConfigs) =>
      id
        ? prevConfigs.map((config) => (config.id === id ? { ...newExternal, id } : config))
        : [...prevConfigs, { ...newExternal, id: crypto.randomUUID() }],
    );
  };

  const handleDelete = (id: string) => {
    setTempExtConfigs((prev) => prev.filter((config) => config.id !== id));
  };

  return (
    <>
      {internalConfigs?.map((conf) => (
        <ValidateNavigationConfig
          key={conf.id}
          propertyLabel={t('ux_editor.settings.navigation_validation_button_label')}
          scope={Scope.SelectedPages}
          config={conf}
          onSave={(newConf) => handleSave(newConf, conf.id)}
          onDelete={() => handleDelete(conf.id)}
        />
      ))}
      <ValidateNavigationConfig
        propertyLabel={t('ux_editor.settings.navigation_validation_button_label')}
        scope={Scope.SelectedPages}
        onSave={(newConf) => handleSave(newConf)}
      />
    </>
  );
};
