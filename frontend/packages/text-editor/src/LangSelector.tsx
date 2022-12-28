import React, { useState } from 'react';
import { Select, Button } from '@altinn/altinn-design-system';
import classes from './LangSelector.module.css';
import type { LangCode, Option } from './types';

export interface ILangSelectorProps {
  onAddLang: (langCode: LangCode) => void;
  options: Option[];
}

const emptyOption: Option = {
  value: '',
  label: '',
};

export const LangSelector = ({ onAddLang, options }: ILangSelectorProps) => {
  const [selectedOption, setSelectedOption] = useState<Option>(emptyOption);
  const handleAddNewLang = () => {
    onAddLang(selectedOption.value);
    setSelectedOption(emptyOption);
  };

  const handleSelectOnChange = (value: string) =>
    setSelectedOption(options.filter((option) => option.value === value)[0]);

  const addButtonProps = {
    ...(selectedOption?.value
      ? { disabled: undefined, onClick: handleAddNewLang }
      : { disabled: true }),
    'data-value': selectedOption.value,
  };
  return (
    <div className={classes.LangSelector}>
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
