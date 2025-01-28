import React, { forwardRef, useEffect, useState } from 'react';
import { StudioIconTextfield, type StudioIconTextfieldProps } from '../StudioIconTextfield';
import { StudioProperty, type StudioPropertyButtonProps } from '../StudioProperty';
import { KeyVerticalIcon } from '@studio/icons';
import classes from './StudioToggleableTextfield.module.css';

export type StudioToggleableTextfieldProps = {
  customValidation?: (value: string) => string | undefined;
  icon?: React.ReactNode;
  inputProps: Omit<StudioIconTextfieldProps, 'icon'>;
  viewProps: Omit<StudioPropertyButtonProps, 'onClick' | 'property' | 'icon'>;
  onIsViewMode?: (isViewMode: boolean) => void;
  setViewModeByDefault?: boolean;
  autoFocus?: boolean;
  label: string;
};

export const StudioToggleableTextfield = forwardRef<HTMLDivElement, StudioToggleableTextfieldProps>(
  (
    {
      icon = <KeyVerticalIcon />,
      inputProps,
      viewProps,
      customValidation,
      onIsViewMode,
      setViewModeByDefault = true,
      autoFocus = true,
      label,
    }: StudioToggleableTextfieldProps,
    ref,
  ) => {
    const [isViewMode, setIsViewMode] = useState(setViewModeByDefault);
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

    const handleBlur = (event: React.FocusEvent<HTMLInputElement>): void => {
      // Should not close the view mode or blur if there is an error
      if (errorMessage || inputProps.error) {
        return;
      }

      toggleViewMode();
      inputProps.onBlur?.(event);
    };

    const handleOnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (customValidation) {
        runCustomValidation(event);
      }

      inputProps.onChange?.(event);
    };

    if (isViewMode)
      return (
        <StudioProperty.Button
          icon={icon}
          property={label}
          onClick={toggleViewMode}
          title={viewProps.title}
          value={viewProps.value}
          className={classes.propertyButton}
        />
      );

    return (
      <StudioIconTextfield
        {...inputProps}
        icon={icon}
        label={label}
        ref={ref}
        onBlur={handleBlur}
        onChange={handleOnChange}
        error={inputProps.error || errorMessage}
        autoFocus={autoFocus}
      />
    );
  },
);

StudioToggleableTextfield.displayName = 'StudioToggleableTextfield';
