import React, { useState } from 'react';
import { Select, Button } from '@altinn/altinn-design-system';
import classes from './LanguageSelector.module.css';
import type { LangCode, Option } from './types';

export interface ILanguageSelectorProps {
  onAddLanguage: (langCode: LangCode) => void;
  options: Option[];
}

const emptyOption: Option = {
  value: '',
  label: '',
};

export const LanguageSelector = ({ onAddLanguage, options }: ILanguageSelectorProps) => {
  const [selectedOption, setSelectedOption] = useState<Option>(emptyOption);
  const handleAddNewLanguage = () => {
    onAddLanguage(selectedOption.value);
    setSelectedOption(emptyOption);
  };

  const handleSelectOnChange = (value: string) =>
    setSelectedOption(options.filter((option) => option.value === value)[0]);

  const addButtonProps = {
    ...(selectedOption?.value
      ? { disabled: undefined, onClick: handleAddNewLanguage }
      : { disabled: true }),
    'data-value': selectedOption.value,
  };
  return (
    <div className={classes.LanguageSelector}>
      <Select
        hideLabel={true}
        onChange={handleSelectOnChange}
        options={options}
        value={selectedOption.value}
      />
      <Button {...addButtonProps}>Legg til</Button>
    </div>
  );
};
