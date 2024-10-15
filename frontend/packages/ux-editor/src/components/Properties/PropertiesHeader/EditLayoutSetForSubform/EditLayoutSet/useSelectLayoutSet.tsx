import React, { useState } from 'react';
import { SelectLayoutSet } from './SelectLayoutSet/SelectLayoutSet';

export const useSelectLayoutSet = (
  existingLayoutSetForSubform: string,
  onUpdateLayoutSet: (layoutSetId: string) => void,
) => {
  const [isLayoutSetSelectorVisible, setIsLayoutSetSelectorVisible] = useState<boolean>(false);

  const renderSelectLayoutSet = (
    <SelectLayoutSet
      existingLayoutSetForSubForm={existingLayoutSetForSubform}
      onUpdateLayoutSet={onUpdateLayoutSet}
      onSetLayoutSetSelectorVisible={setIsLayoutSetSelectorVisible}
    />
  );

  return {
    isLayoutSetSelectorVisible,
    setIsLayoutSetSelectorVisible,
    renderSelectLayoutSet,
  };
};
