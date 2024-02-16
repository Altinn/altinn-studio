import React, { useId, useState } from 'react';
import type { StudioTextfieldToggleViewProps } from './StudioTextfieldToggleView/StudioTextfieldToggleView';
import {
  StudioIconTextfield,
  type StudioIconTextfieldProps,
} from './StudioIconTextfield/StudioIconTextfield';
import { StudioTextfieldToggleView } from './StudioTextfieldToggleView/StudioTextfieldToggleView';
import { HelpText } from '@digdir/design-system-react';

export type StudioToggableTextfieldProps = {
  viewProps: StudioTextfieldToggleViewProps;
  inputProps: StudioIconTextfieldProps;
  helpText?: string;
  customValidation?: (value: string) => string | undefined;
};

export const StudioToggableTextfield = ({
  inputProps,
  viewProps,
  helpText,
  customValidation,
}: StudioToggableTextfieldProps) => {
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
    if (customValidation) runCustomValidation(event);
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
