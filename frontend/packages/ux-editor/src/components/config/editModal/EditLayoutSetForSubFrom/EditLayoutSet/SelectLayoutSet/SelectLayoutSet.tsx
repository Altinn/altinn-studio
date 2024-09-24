import React from 'react';
import { StudioNativeSelect } from '@studio/components';
import { useTranslation } from 'react-i18next';

type SelectLayoutSetProps = {
  layoutSetsActingAsSubForm: string[];
  existingLayoutSetForSubForm: string;
  onUpdateLayoutSet: (layoutSetId: string) => void;
  onSetLayoutSetSelectVisible: (visible: boolean) => void;
};

export const SelectLayoutSet = ({
  layoutSetsActingAsSubForm,
  existingLayoutSetForSubForm,
  onUpdateLayoutSet,
  onSetLayoutSetSelectVisible,
}: SelectLayoutSetProps) => {
  const { t } = useTranslation();

  const handleSelectChange = (layoutSetId: string) => {
    onUpdateLayoutSet(layoutSetId);
    onSetLayoutSetSelectVisible(false);
  };

  return (
    <StudioNativeSelect
      size='small'
      onChange={({ target }) => handleSelectChange(target.value)}
      label={'set layout set'}
      defaultValue={existingLayoutSetForSubForm}
      onBlur={() => onSetLayoutSetSelectVisible(false)}
    >
      <option>{'Velg en sidegruppe...'}</option>
      {layoutSetsActingAsSubForm.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </StudioNativeSelect>
  );
};
