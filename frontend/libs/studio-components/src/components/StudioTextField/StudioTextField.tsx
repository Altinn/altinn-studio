import React, { useState } from 'react';
import type { StudioTextfieldToggleViewProps } from './StudioTextfieldToggleView/StudioTextfieldToggleView';
import {
  StudioIconTextfield,
  type StudioIconTextfieldProps,
} from './StudioIconTextfield/StudioIconTextfield';
import { StudioTextfieldToggleView } from './StudioTextfieldToggleView/StudioTextfieldToggleView';
import { HelpText } from '@digdir/design-system-react';

export type StudioTextFieldProps = {
  viewProps: StudioTextfieldToggleViewProps;
  inputProps: StudioIconTextfieldProps;
  helpText?: string;
  customValidation?: (value: string) => string | undefined;
};
export const StudioTextField = ({
  inputProps,
  viewProps,
  helpText,
  customValidation,
}: StudioTextFieldProps) => {
  const [isViewMode, setIsViewMode] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(null);

  const toggleViewMode = () => {
    setIsViewMode((prevMode) => !prevMode);
  };

  const handleValidation = (event: React.ChangeEvent<HTMLInputElement>) => {
    const isErrorExists = customValidation(event.target.value);
    if (isErrorExists) {
      setErrorMessage(isErrorExists);
      return;
    }
    setErrorMessage(undefined);
    inputProps.onChange?.(event);
  };

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    toggleViewMode();
    inputProps.onBlur?.(event);
  };

  // TODO: Fix helpText icon toggle

  if (isViewMode) return <StudioTextfieldToggleView onClick={toggleViewMode} {...viewProps} />;
  return (
    <div>
      <StudioIconTextfield
        {...inputProps}
        onBlur={handleBlur}
        onChange={handleValidation}
        error={errorMessage}
        autoFocus
      />
      {helpText && <HelpText title={helpText}>{helpText}</HelpText>}
    </div>
  );
};
