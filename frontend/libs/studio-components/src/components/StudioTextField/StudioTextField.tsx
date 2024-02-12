import React, { useId, useState } from 'react';
import type { StudioTextfieldToggleViewProps } from './StudioTextfieldToggleView/StudioTextfieldToggleView';
import {
  StudioIconTextfield,
  type StudioIconTextfieldProps,
} from './StudioIconTextfield/StudioIconTextfield';
import { StudioTextfieldToggleView } from './StudioTextfieldToggleView/StudioTextfieldToggleView';
import { HelpText } from '@digdir/design-system-react';
import classes from './StudioTextField.module.css';

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
  const helpTextId = useId();

  const toggleViewMode = () => {
    setIsViewMode((prevMode) => !prevMode);
  };

  const runCustomValidation = (event: React.ChangeEvent<HTMLInputElement>): boolean => {
    const isErrorExists = customValidation(event.target.value);
    if (isErrorExists) {
      setErrorMessage(isErrorExists);
      return true;
    }
    setErrorMessage(undefined);
    return false;
  };

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    if (event.relatedTarget?.id !== helpTextId) {
      toggleViewMode();
    }
    inputProps.onBlur?.(event);
  };

  const handleOnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (customValidation) {
      const hasError = runCustomValidation(event);
      if (hasError) return;
    }

    inputProps.onChange?.(event);
  };

  if (isViewMode) return <StudioTextfieldToggleView onClick={toggleViewMode} {...viewProps} />;
  return (
    <>
      <div className={classes.StudioIconTextfield}>
        <StudioIconTextfield
          {...inputProps}
          onBlur={handleBlur}
          onChange={handleOnChange}
          error={inputProps.error || errorMessage}
          autoFocus
        />
      </div>
      <div className={classes.helpText}>
        {helpText && (
          <HelpText id={helpTextId} title={helpText}>
            {helpText}
          </HelpText>
        )}
      </div>
    </>
  );
};
