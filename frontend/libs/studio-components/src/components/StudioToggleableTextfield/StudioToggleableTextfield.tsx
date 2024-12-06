import React, { forwardRef, useEffect, useState } from 'react';
import {
  StudioTextfieldToggleView,
  type StudioTextfieldToggleViewProps,
} from './StudioTextfieldToggleView';

import { StudioIconTextfield, type StudioIconTextfieldProps } from '../StudioIconTextfield';

export type StudioToggleableTextfieldProps = {
  customValidation?: (value: string) => string | undefined;
  inputProps: StudioIconTextfieldProps;
  viewProps: Omit<StudioTextfieldToggleViewProps, 'onClick'>;
  onIsViewMode?: (isViewMode: boolean) => void;
  setViewModeByDefault?: boolean;
  autoFocus?: boolean;
};

export const StudioToggleableTextfield = forwardRef<HTMLDivElement, StudioToggleableTextfieldProps>(
  (
    {
      inputProps,
      viewProps,
      customValidation,
      onIsViewMode,
      setViewModeByDefault = true,
      autoFocus = true,
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

    if (isViewMode) return <StudioTextfieldToggleView onClick={toggleViewMode} {...viewProps} />;

    return (
      <StudioIconTextfield
        {...inputProps}
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
