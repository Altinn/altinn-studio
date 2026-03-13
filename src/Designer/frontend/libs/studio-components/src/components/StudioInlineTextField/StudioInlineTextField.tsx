import React from 'react';
import type { ChangeEvent } from 'react';
import { StudioFormActions } from '../StudioFormActions/StudioFormActions';
import { StudioProperty } from '../StudioProperty';
import { StudioTextfield } from '../StudioTextfield/StudioTextfield';
import cn from 'classnames';
import classes from './StudioInlineTextField.module.css';

export type StudioInlineTextFieldProps = {
  value: string;
  onChange: (newValue: string) => void;
  label: string;
  description?: string;
  required?: boolean;
  tagText?: string;
  className?: string;
  saveAriaLabel: string;
  cancelAriaLabel: string;
  onUnsavedValueChange?: (hasUnsavedValue: boolean) => void;
};

export const StudioInlineTextField = ({
  value,
  onChange,
  label,
  description,
  required,
  tagText,
  className,
  saveAriaLabel,
  cancelAriaLabel,
  onUnsavedValueChange,
}: StudioInlineTextFieldProps): React.ReactElement => {
  const [isEditMode, setIsEditMode] = React.useState(false);

  const openEditMode = (): void => setIsEditMode(true);

  if (!isEditMode) {
    return <StudioProperty.Button property={label} value={value} onClick={openEditMode} />;
  }

  const handleSaveFieldInput = (newValue: string): void => {
    onChange(newValue);
    setIsEditMode(false);
  };

  const handleCancelFieldInput = (): void => setIsEditMode(false);

  return (
    <InlineTextFieldEdit
      value={value}
      label={label}
      description={description}
      required={required}
      tagText={tagText}
      className={className}
      saveAriaLabel={saveAriaLabel}
      cancelAriaLabel={cancelAriaLabel}
      onSave={handleSaveFieldInput}
      onCancel={handleCancelFieldInput}
      onUnsavedValueChange={onUnsavedValueChange}
    />
  );
};

StudioInlineTextField.displayName = 'StudioInlineTextField';

type InlineTextFieldEditProps = {
  value: string;
  label: string;
  description?: string;
  required?: boolean;
  tagText?: string;
  className?: string;
  saveAriaLabel: string;
  cancelAriaLabel: string;
  onSave: (newValue: string) => void;
  onCancel: () => void;
  onUnsavedValueChange?: (hasUnsavedValue: boolean) => void;
};

const InlineTextFieldEdit = ({
  value,
  label,
  description,
  required,
  tagText,
  className,
  saveAriaLabel,
  cancelAriaLabel,
  onSave,
  onCancel,
  onUnsavedValueChange,
}: InlineTextFieldEditProps): React.ReactElement => {
  const [inputValue, setInputValue] = React.useState(value);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onUnsavedValueChange?.(newValue !== value);
  };

  const handleSave = (): void => {
    onSave(inputValue);
    onUnsavedValueChange?.(false);
  };
  const handleCancel = (): void => {
    onUnsavedValueChange?.(false);
    onCancel();
  };

  const primary = {
    label: saveAriaLabel,
    onClick: handleSave,
  };

  const secondary = {
    label: cancelAriaLabel,
    onClick: handleCancel,
  };

  return (
    <div className={cn(classes.editing, className)}>
      <StudioTextfield
        label={label}
        description={description}
        required={required}
        tagText={tagText}
        value={inputValue}
        onChange={handleInputChange}
      />
      <StudioFormActions primary={primary} secondary={secondary} isLoading={false} iconOnly />
    </div>
  );
};
