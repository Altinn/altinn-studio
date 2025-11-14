import React, { forwardRef, useEffect, useState } from 'react';
import type { Ref, ReactElement } from 'react';
import { StudioIconTextfield, type StudioIconTextfieldProps } from '../StudioIconTextfield';
import { StudioProperty } from '../StudioProperty';
import { KeyHorizontalIcon } from '@studio/icons';
import classes from './StudioToggleableTextfield.module.css';
import type { Override } from '../../types/Override';

type InputChangeEvent = React.ChangeEvent<HTMLInputElement>;
type InputFocusEvent = React.FocusEvent<HTMLInputElement>;

export type StudioToggleableTextfieldProps = Override<
  {
    customValidation?: (value: string) => string | undefined;
    onIsViewMode?: (isViewMode: boolean) => void;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  },
  Omit<StudioIconTextfieldProps, 'onChange' | 'onBlur'>
>;

function StudioToggleableTextfield(
  {
    error,
    customValidation,
    icon = <KeyHorizontalIcon />,
    label,
    onBlur,
    onChange,
    onClick,
    onIsViewMode,
    title,
    value,
    defaultValue,
    ...rest
  }: StudioToggleableTextfieldProps,
  ref: Ref<HTMLDivElement>,
): ReactElement {
  const [isViewMode, setIsViewMode] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [currentValue, setCurrentValue] = useState<string>(String(value ?? defaultValue ?? ''));

  useEffect(() => {
    if (onIsViewMode) onIsViewMode(isViewMode);
  }, [isViewMode, onIsViewMode]);

  useEffect(() => {
    setCurrentValue(String(value ?? defaultValue ?? ''));
  }, [value, defaultValue]);

  const toggleViewMode = (): void => {
    setIsViewMode((prevMode) => !prevMode);
  };

  const runCustomValidation = (event: InputChangeEvent): boolean => {
    const errorValidationMessage = customValidation?.(event.target.value);
    if (errorValidationMessage) {
      setErrorMessage(errorValidationMessage);
      return true;
    }
    setErrorMessage(undefined);
    return false;
  };

  const handleOnBlur = (event: InputFocusEvent): void => {
    if (errorMessage || error) return;
    toggleViewMode();
    onBlur?.(event);
  };

  const handleOnChange = (event: InputChangeEvent): void => {
    setCurrentValue(event.target.value);
    if (customValidation) {
      runCustomValidation(event);
    }
    onChange?.(event);
  };

  if (isViewMode)
    return (
      <StudioProperty.Button
        icon={icon}
        property={label}
        onClick={toggleViewMode}
        title={title}
        value={currentValue}
        className={classes.propertyButton}
      />
    );
  return (
    <StudioIconTextfield
      className={classes.textfield}
      autoFocus
      error={error || errorMessage}
      icon={icon}
      label={label}
      onBlur={handleOnBlur}
      onChange={handleOnChange}
      ref={ref}
      title={title}
      value={currentValue}
      defaultValue={defaultValue}
      onClick={onClick}
      {...rest}
    />
  );
}

const ForwardedStudioToggleableTextfield = forwardRef(StudioToggleableTextfield);

export { ForwardedStudioToggleableTextfield as StudioToggleableTextfield };
