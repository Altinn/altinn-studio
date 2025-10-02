import React, { forwardRef, useEffect, useState } from 'react';
import type { Ref, ReactElement } from 'react';
import { StudioIconTextfield, type StudioIconTextfieldProps } from '../StudioIconTextfield';
import { StudioProperty } from '../StudioProperty';
import { KeyHorizontalIcon } from '@studio/icons';
import classes from './StudioToggleableTextfield.module.css';
import type { Override } from '../../types/Override';

type InputChangeEvent = React.ChangeEvent<HTMLInputElement>;
type InputFocusEvent = React.FocusEvent<HTMLInputElement>;
type TextAreaFocusEvent = React.FocusEvent<HTMLTextAreaElement>;
type TextAreaChangeEvent = React.ChangeEvent<HTMLTextAreaElement>;

export type StudioToggleableTextfieldProps = Override<
  {
    customValidation?: (value: string) => string | undefined;
    onIsViewMode?: (isViewMode: boolean) => void;
  },
  StudioIconTextfieldProps
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

  useEffect(() => {
    if (onIsViewMode) onIsViewMode(isViewMode);
  }, [isViewMode, onIsViewMode]);

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

  const handleOnBlur = (event: TextAreaFocusEvent & InputFocusEvent): void => {
    if (errorMessage || error) return;
    toggleViewMode();
    onBlur?.(event);
  };

  const handleOnChange = (event: TextAreaChangeEvent & InputChangeEvent): void => {
    if (customValidation) {
      runCustomValidation(event as InputChangeEvent);
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
        value={value ?? defaultValue}
        className={classes.propertyButton}
      />
    );
  return (
    <StudioIconTextfield
      autoFocus
      error={error || errorMessage}
      icon={icon}
      label={label}
      onBlur={handleOnBlur}
      onChange={handleOnChange}
      ref={ref}
      title={title}
      value={value}
      defaultValue={defaultValue}
      {...rest}
    />
  );
}

const ForwardedStudioToggleableTextfield = forwardRef(StudioToggleableTextfield);

export { ForwardedStudioToggleableTextfield as StudioToggleableTextfield };
