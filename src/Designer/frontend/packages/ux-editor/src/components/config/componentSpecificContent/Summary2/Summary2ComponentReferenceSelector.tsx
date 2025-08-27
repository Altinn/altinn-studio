import React from 'react';
import { StudioCombobox } from 'libs/studio-components-legacy/src';
import { useTranslation } from 'react-i18next';

type Summary2ComponentTargetIdProps = {
  label: string;
  value: string;
  options: { id: string; description: string }[];
  onValueChange: (value: string) => void;
};

export const Summary2ComponentReferenceSelector = ({
  label,
  value,
  options,
  onValueChange,
}: Summary2ComponentTargetIdProps) => {
  const invalidOption = Boolean(value) && !options.some((option) => option.id === value);
  const { t } = useTranslation();

  const invalidMessage = invalidOption && t('ux_editor.component_properties.target_invalid');
  const requiredMessage = !value && t('ux_editor.component_properties.enum_Required');
  const errorMessage = invalidMessage || requiredMessage || false;

  return (
    <StudioCombobox
      size='small'
      label={label}
      value={value ? [value] : []}
      onValueChange={(v) => onValueChange(v[0])}
      error={errorMessage}
    >
      <StudioCombobox.Empty>
        {t('ux_editor.component_properties.target_empty')}
      </StudioCombobox.Empty>
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
