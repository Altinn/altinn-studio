import React, { useState } from 'react';
import { ValidateNavigationConfig } from '../ValidateNavigationConfig';
import { Scope, convertToExternalConfig, dummyDataPages } from '../utils/ValidateNavigationUtils';
import type { ExternalConfigState, InternalConfigState } from '../utils/ValidateNavigationTypes';
import { useConvertToInternalConfig } from '../utils/useConvertToInternalConfig';

export const ValidateSelectedPagesConfig = () => {
  const [tempExtConfigs, setTempExtConfigs] = useState<ExternalConfigState[]>(dummyDataPages);

  const internalConfigs = useConvertToInternalConfig(tempExtConfigs);

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
