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
  saveAriaLabel?: string;
  cancelAriaLabel?: string;
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
}: StudioInlineTextFieldProps): React.ReactElement => {
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(value);

  const openEditMode = (): void => {
    setInputValue(value);
    setIsEditMode(true);
  };

  if (!isEditMode) {
    return (
      <StudioProperty.Button
        property={label}
        value={value}
        onClick={openEditMode}
        className={classes.viewMode}
      />
    );
  }

  const saveValue = (): void => {
    onChange?.(inputValue);
    setIsEditMode(false);
  };

  const cancelEditing = (): void => {
    setInputValue(value);
    setIsEditMode(false);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setInputValue(e.target.value);
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
      <StudioFormActions
        primary={{
          label: saveAriaLabel,
          onClick: saveValue,
        }}
        secondary={{
          label: cancelAriaLabel,
          onClick: cancelEditing,
        }}
        isLoading={false}
        iconOnly
      />
    </div>
  );
};

StudioInlineTextField.displayName = 'StudioInlineTextField';
