import React from 'react';
import type { ChangeEvent } from 'react';
import { StudioButton } from '../StudioButton/StudioButton';
import { StudioTextfield } from '../StudioTextfield/StudioTextfield';
import { StudioCancelIcon, StudioEditIcon, StudioSaveIcon } from '@studio/icons';
import { StudioLabel } from '../StudioLabel';
import { StudioParagraph } from '../StudioParagraph';
import cn from 'classnames';
import classes from './StudioInlineEdit.module.css';

export type StudioInlineEditProps = {
  value: string;
  onChange?: (newValue: string) => void;
  label?: string;
  description?: React.ReactNode;
  required?: boolean;
  tagText?: string;
  className?: string;
  icon?: React.ReactNode;
};

export const StudioInlineEdit = ({
  value,
  onChange,
  label,
  description,
  required,
  tagText,
  className,
  icon,
}: StudioInlineEditProps): React.ReactElement => {
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(value);
  const toggleViewModeContent = value ? classes.viewModeContent : undefined;

  const handleClick = (): void => {
    setInputValue(value);
    setIsEditMode(true);
  };

  if (!isEditMode) {
    return (
      <StudioButton
        variant='tertiary'
        className={classes.viewMode}
        onClick={handleClick}
        aria-label={label}
        icon={!value && icon}
      >
        <div className={toggleViewModeContent}>
          <StudioLabel>{label}</StudioLabel>
          <StudioParagraph>{value}</StudioParagraph>
        </div>
        {value && <StudioEditIcon />}
      </StudioButton>
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
      <StudioButton
        data-testid='studio-inline-edit-save'
        icon={<StudioSaveIcon />}
        onClick={saveValue}
      />
      <StudioButton variant='secondary' icon={<StudioCancelIcon />} onClick={cancelEditing} />
    </div>
  );
};

StudioInlineEdit.displayName = 'StudioInlineEdit';
