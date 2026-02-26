import React, { useState } from 'react';
import { ValidateNavigationConfig } from '../ValidateNavigationConfig';
import {
  Scope,
  convertToExternalConfig,
  dummyDataTasks,
  withUniqueIds,
} from '../utils/ValidateNavigationUtils';
import type { ExternalConfigWithId, InternalConfigState } from '../utils/ValidateNavigationTypes';
import { useConvertToInternalConfig } from '../utils/useConvertToInternalConfig';

export const ValidateSelectedTasksConfig = () => {
  const [tempExtConfigs, setTempExtConfigs] = useState<ExternalConfigWithId[]>( // This is just to simulate the save functionality, in real implementation this would be handled differently
    withUniqueIds(dummyDataTasks),
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
            scope={Scope.SelectedTasks}
            config={conf}
            onSave={(newConf) => handleSave(newConf, conf.id)}
            onDelete={() => handleDelete(conf.id)}
          />
        ))}
      <ValidateNavigationConfig
        scope={Scope.SelectedTasks}
        onSave={(newConf) => handleSave(newConf)}
      />
    </>
  );
};
