import React, { useId } from 'react';
import { ErrorMessage, TextField } from '@digdir/design-system-react';
import classes from './TextFieldWithValidation.module.css';
import { Validation } from '../../utils/validationUtils';
import { useValidation } from '../../hooks';

export interface TextFieldWithValidationProps {
  label: string;
  value: string;
  name: string;
  validation: Validation;
  inputMode?: 'search' | 'text' | 'none' | 'tel' | 'numeric' | 'url' | 'email' | 'decimal';
  onChange: (event: React.ChangeEvent<HTMLInputElement>, error: string) => void;
  onBlur?: (event: React.ChangeEvent<HTMLInputElement>, error: string) => void;
}
export const TextFieldWithValidation = ({
  label,
  value,
  name,
  validation,
  inputMode = 'text',
  onChange,
  onBlur,
}: TextFieldWithValidationProps): JSX.Element => {
  const { validationError, validate } = useValidation(name, validation);
  const errorMessageId = useId();

  const validateOnBlur = (event: React.FocusEvent<HTMLInputElement>): void => {
    if (onBlur) {
      const error = validate(event.target.value);
      onBlur(event, error);
    }
  };

  const handleOnTextFieldChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const error = validate(event.target.value);
    onChange(event, error);
  };

  const textFieldLabel = `${label} ${validation?.required ? '*' : ''}`;
  const isRequired = !!validation?.required;

  return (
    <>
      <TextField
        value={value}
        name={name}
        inputMode={inputMode}
        label={textFieldLabel}
        onBlur={validateOnBlur}
        onChange={handleOnTextFieldChange}
        aria-errormessage={errorMessageId}
        aria-invalid={!!validationError}
        aria-required={isRequired}
        required={isRequired}
      />
      {validationError && (
        <ErrorMessage id={errorMessageId} className={classes.errorMessageText}>
          {validationError}
        </ErrorMessage>
      )}
    </>
  );
};
