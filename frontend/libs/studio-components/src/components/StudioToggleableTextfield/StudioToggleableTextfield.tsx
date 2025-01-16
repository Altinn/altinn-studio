import React, { forwardRef, useEffect, useState } from 'react';
import { StudioTextfieldToggleView } from './StudioTextfieldToggleView';
import type { StudioIconTextfieldProps } from '../StudioIconTextfield';
import { StudioIconTextfield } from '../StudioIconTextfield';
import { KeyVerticalIcon } from '../../../../studio-icons';

export type StudioToggleableTextfieldProps = {
  customValidation?: (value: string) => string | undefined;
  onIsViewMode?: (isViewMode: boolean) => void;
} & StudioIconTextfieldProps;

export const StudioToggleableTextfield = forwardRef<HTMLDivElement, StudioToggleableTextfieldProps>(
  (
    {
      customValidation,
      error,
      Icon = KeyVerticalIcon,
      label,
      onBlur,
      onChange,
      onIsViewMode,
      title,
      value,
    }: StudioToggleableTextfieldProps,
    ref,
  ) => {
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

    const handleBlur = (event: React.FocusEvent<HTMLInputElement>): void => {
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
        <StudioTextfieldToggleView
          Icon={Icon}
          label={label}
          onClick={toggleViewMode}
          title={title}
          value={value}
        />
      );

    return (
      <StudioIconTextfield
        autoFocus
        error={error || errorMessage}
        Icon={Icon}
        label={label}
        onBlur={handleBlur}
        onChange={handleOnChange}
        ref={ref}
        title={title}
        value={value}
      />
    );
  },
);

StudioToggleableTextfield.displayName = 'StudioToggleableTextfield';
