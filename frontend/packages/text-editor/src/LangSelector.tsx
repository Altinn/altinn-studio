import React, { useState } from 'react';
import { LegacySelect } from '@digdir/design-system-react';
import classes from './LangSelector.module.css';
import type { LangCode, Option } from './types';
import { StudioButton } from '@studio/components';
import type { StudioButtonProps } from '@studio/components';
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

  const handleSelectOnChange = (value: string) =>
    setSelectedOption(options.filter((option) => option.value === value)[0]);

  const addButtonProps: StudioButtonProps & { 'data-value': string } = {
    ...(selectedOption?.value
      ? { disabled: undefined, onClick: handleAddNewLang }
      : { disabled: true }),
    'data-value': selectedOption.value,
  };
  return (
    <div className={classes.languageSelector}>
      <div className={classes.selectWrapper}>
        <LegacySelect
          label={t('schema_editor.language_add_language')}
          onChange={handleSelectOnChange}
          options={options}
          value={selectedOption.value}
        />
      </div>
      <div>
        <StudioButton {...addButtonProps}>{t('general.add')}</StudioButton>
      </div>
    </div>
  );
};
