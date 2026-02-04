import React from 'react';
import { StudioSuggestion, type StudioSuggestionItem } from '@studio/components';
import { useTranslation } from 'react-i18next';
import classes from './Summary2ComponentReferenceSelector.module.css';

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

  const selectedItems: StudioSuggestionItem = value ? { value, label: value } : undefined;

  const handleSelectedChange = (item: StudioSuggestionItem) => onValueChange(item.value || '');

  return (
    <StudioSuggestion
      multiple={false}
      label={label}
      emptyText={t('ux_editor.component_properties.target_empty')}
      selected={selectedItems}
      onSelectedChange={handleSelectedChange}
      error={errorMessage}
    >
      {options.map((option) => (
        <StudioSuggestion.Option value={option.id} key={option.id} label={option.id}>
          <div>
            <div>{option.id}</div>
            <div className={classes.optionDescription}>{option.description}</div>
          </div>
        </StudioSuggestion.Option>
      ))}
      {value && invalidOption && (
        <StudioSuggestion.Option disabled value={value} key={value} label={value}>
          {value}
        </StudioSuggestion.Option>
      )}
    </StudioSuggestion>
  );
};
