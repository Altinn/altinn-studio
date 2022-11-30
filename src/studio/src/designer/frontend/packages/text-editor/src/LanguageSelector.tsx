import React, { useState } from 'react';
import { Select, Button } from '@altinn/altinn-design-system';
import classes from './LanguageSelector.module.css';
import type { Option } from './types';

export interface ILanguageSelectorProps {
  onAddLanguage: (languageOption: Option) => void;
  options: Option[];
}

const emptyOption: Option = {
  value: '',
  label: '',
};

export const LanguageSelector = ({ onAddLanguage, options }: ILanguageSelectorProps) => {
  const [selectedOption, setSelectedOption] = useState<Option>(emptyOption);
  const handleAddNewLanguage = () => {
    onAddLanguage(selectedOption);
    setSelectedOption(emptyOption);
  };

  const handleSelectOnChange = (value: string) => {
    const selectedOption = options.filter((option) => option.value === value)[0];
    setSelectedOption(selectedOption);
  };
  const addButtonProps = {
    ...(selectedOption?.value ? { disabled: undefined, onClick: handleAddNewLanguage } : { disabled: true }),
    'data-value': selectedOption.value,
  };
  return (
    <div className={classes.LanguageSelector}>
      <Select hideLabel={true} onChange={handleSelectOnChange} options={options} value={selectedOption.value} />
      <Button {...addButtonProps}>Legg til</Button>
    </div>
  );
};
