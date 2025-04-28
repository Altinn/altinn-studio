import React, { forwardRef, useEffect, useState } from 'react';
import { StudioIconTextfield, type StudioIconTextfieldProps } from '../StudioIconTextfield';
import { StudioProperty } from '../StudioProperty';
import { KeyHorizontalIcon } from '@studio/icons';
import classes from './StudioToggleableTextfield.module.css';
import type { Override } from '../../types/Override';

export type StudioToggleableTextfieldProps = Override<
  {
    customValidation?: (value: string) => string | undefined;
    onIsViewMode?: (isViewMode: boolean) => void;
  },
  StudioIconTextfieldProps
>;

export const StudioToggleableTextfield = forwardRef<HTMLDivElement, StudioToggleableTextfieldProps>(
  (
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
    ref,
  ): React.ReactElement => {
    const [isViewMode, setIsViewMode] = useState<boolean>(true);
    const [errorMessage, setErrorMessage] = useState<string | undefined>(null);

    useEffect(() => {
      if (onIsViewMode) onIsViewMode(isViewMode);
    }, [isViewMode, onIsViewMode]);

    const toggleViewMode = (): void => {
      setIsViewMode((prevMode) => !prevMode);
    };

    const runCustomValidation = (event: React.ChangeEvent<HTMLInputElement>): boolean => {
      const errorValidationMessage = customValidation(event.target.value);

      if (errorValidationMessage) {
        setErrorMessage(errorValidationMessage);
        return true;
      }
      setErrorMessage(null);
      return false;
    };

    const handleOnBlur = (event: React.FocusEvent<HTMLInputElement>): void => {
      // Should not close the view mode or blur if there is an error
      if (errorMessage || error) {
        return;
      }

      toggleViewMode();
      onBlur?.(event);
    };

    const handleOnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
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
  },
);

StudioToggleableTextfield.displayName = 'StudioToggleableTextfield';
