import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ValidateNavigationConfig } from '../ValidateNavigationConfig';
import { Scope, convertToExternalConfig, withUniqueIds } from '../utils/ValidateNavigationUtils';
import type { ExternalConfigWithId, InternalConfigState } from '../utils/ValidateNavigationTypes';
import { useConvertToInternalConfig } from '../utils/useConvertToInternalConfig';

export const ValidateSelectedTasksConfig = () => {
  const { t } = useTranslation();

  const dummyData = [
    {
      show: ['Schema', 'Component'],
      page: 'current',
      tasks: ['oppgave1', 'oppgave2'],
    },
    {
      show: ['Schema'],
      page: 'currentAndPrevious',
      tasks: ['oppgave3'],
    },
  ];

  const [tempExtConfigs, setTempExtConfigs] = useState<ExternalConfigWithId[]>( // This is just to simulate the save functionality, in real implementation this would be handled differently
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
      {internalConfigs &&
        internalConfigs.map((conf, index) => (
          <ValidateNavigationConfig
            key={conf.id}
            propertyLabel={t('ux_editor.settings.navigation_validation_button_label')}
            scope={Scope.SelectedTasks}
            config={conf}
            onSave={(newConf) => handleSave(newConf, conf.id)}
            onDelete={() => handleDelete(conf.id)}
          />
        ))}
      <ValidateNavigationConfig
        propertyLabel={t('ux_editor.settings.navigation_validation_button_label')}
        scope={Scope.SelectedTasks}
        onSave={(newConf) => handleSave(newConf)}
      />
    </>
  );
};
