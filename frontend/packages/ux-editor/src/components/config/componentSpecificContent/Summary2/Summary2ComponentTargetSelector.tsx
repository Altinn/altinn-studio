import React from 'react';
import { StudioCombobox } from '@studio/components';
import { useTranslation } from 'react-i18next';

type Summary2ComponentTargetIdProps = {
  label: string;
  value: string;
  options: { id: string; description: string }[];
  onValueChange: (value: string) => void;
};

export const Summmary2ComponentTargetSelector = ({
  label,
  value,
  options,
  onValueChange,
}: Summary2ComponentTargetIdProps) => {
  const invalidOption = Boolean(value) && !options.some((option) => option.id === value);
  const { t } = useTranslation();
  return (
    <StudioCombobox
      size='small'
      label={label}
      value={value ? [value] : []}
      onValueChange={(v) => onValueChange(v[0])}
      error={invalidOption ? t('ux_editor.component_properties.target_invalid') : false}
      multiple={false}
    >
      {options.map((option) => (
        <StudioCombobox.Option value={option.id} key={option.id} description={option.description}>
          {option.id}
        </StudioCombobox.Option>
      ))}
      {value && invalidOption && (
        <StudioCombobox.Option disabled value={value} key={value}>
          {value}
        </StudioCombobox.Option>
      )}
    </StudioCombobox>
  );
};
