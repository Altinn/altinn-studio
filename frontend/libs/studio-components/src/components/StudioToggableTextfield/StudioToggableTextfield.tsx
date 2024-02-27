import React, { useId, useState } from 'react';

import { HelpText } from '@digdir/design-system-react';
import {
  StudioTextfieldToggleView,
  type StudioTextfieldToggleViewProps,
} from './StudioTextfieldToggleView';

import { StudioIconTextfield, type StudioIconTextfieldProps } from '../StudioIconTextfield';

export type StudioToggleableTextfieldProps = {
  customValidation?: (value: string) => string | undefined;
  helpText?: string;
  inputProps: StudioIconTextfieldProps;
  viewProps: Omit<StudioTextfieldToggleViewProps, 'onClick'>;
};

export const StudioToggleableTextfield = ({
  inputProps,
  viewProps,
  helpText,
  customValidation,
}: StudioToggleableTextfieldProps) => {
  const [isViewMode, setIsViewMode] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(null);
  const helpTextId = useId();

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

    if (event.relatedTarget?.id !== helpTextId) {
      toggleViewMode();
    }

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
    <>
      <StudioIconTextfield
        name={'componentIdInput'}
        {...inputProps}
        onBlur={handleBlur}
        onChange={handleOnChange}
        error={inputProps.error || errorMessage}
        autoFocus
      />
      {helpText && (
        <HelpText id={helpTextId} title={helpText}>
          {helpText}
        </HelpText>
      )}
    </>
  );
};
