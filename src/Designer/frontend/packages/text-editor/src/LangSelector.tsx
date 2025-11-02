import React, { useState } from 'react';
import classes from './LangSelector.module.css';
import type { LangCode, Option } from './types';
import type { StudioButtonProps } from '@studio/components';
import { StudioButton, StudioSelect } from '@studio/components';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const handleAddNewLang = () => {
    onAddLang(selectedOption.value);
    setSelectedOption(emptyOption);
  };

  const handleSelectOnChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedOption(options.filter((option) => option.value === event.target.value)[0]);
  };

  const addButtonProps: StudioButtonProps & { 'data-value': string } = {
    ...(selectedOption?.value
      ? { disabled: undefined, onClick: handleAddNewLang }
      : { disabled: true }),
    'data-value': selectedOption.value,
  };
  return (
    <div className={classes.languageSelector}>
      <div className={classes.selectWrapper}>
        <StudioSelect
          label={t('schema_editor.language_add_language')}
          onChange={handleSelectOnChange}
          value={selectedOption.value}
          data-size='sm'
        >
          <option value='' disabled hidden></option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </StudioSelect>
      </div>
      <div>
        <StudioButton {...addButtonProps}>{t('general.add')}</StudioButton>
      </div>
    </div>
  );
};
