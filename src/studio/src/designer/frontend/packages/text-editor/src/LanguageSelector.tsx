import React, { useState } from 'react';
import Select from 'react-select';
import { Button } from '@altinn/altinn-design-system';
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

  const handleSelectOnChange = ({ label, value }: Option) => {
    setSelectedOption({ label, value });
  };
  const addButtonProps = {
    ...(selectedOption?.value
      ? { disabled: undefined, onClick: handleAddNewLanguage }
      : { disabled: true }),
    'data-value': selectedOption.value,
  };
  return (
    <div className={classes.LanguageSelector}>
      <Select onChange={handleSelectOnChange} options={options} value={selectedOption} />
      <Button {...addButtonProps}>Legg til</Button>
    </div>
  );
};
