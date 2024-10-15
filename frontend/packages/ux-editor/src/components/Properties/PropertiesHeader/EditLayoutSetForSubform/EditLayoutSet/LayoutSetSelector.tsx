import React, { useState } from 'react';
import { SelectLayoutSet } from './SelectLayoutSet/SelectLayoutSet';

export type useSelectLayoutSetProps = {
  existingLayoutSetForSubform: string;
  onUpdateLayoutSet: (layoutSetId: string) => void;
};
export const LayoutSetSelector = ({
  existingLayoutSetForSubform,
  onUpdateLayoutSet,
}: useSelectLayoutSetProps) => {
  const [isLayoutSetSelectorVisible, setIsLayoutSetSelectorVisible] = useState(false);

  const renderSelectLayoutSet = (
    <SelectLayoutSet
      existingLayoutSetForSubForm={existingLayoutSetForSubform}
      onUpdateLayoutSet={onUpdateLayoutSet}
      onSetLayoutSetSelectorVisible={setIsLayoutSetSelectorVisible}
    />
  );

  return { isLayoutSetSelectorVisible, renderSelectLayoutSet, setIsLayoutSetSelectorVisible };
};
