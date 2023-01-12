import React, { useId } from 'react';
import { TextField } from '@altinn/altinn-design-system';
import { ErrorMessage } from '@digdir/design-system-react';
import classes from './TextFieldWithValidation.module.css';
import { Validation } from '../../utils/validationUtils';
import { useValidation } from '../../hooks/useValidation';

export interface TextFieldWithValidationProps {
  label: string;
  value: string;
  name: string;
  className?: string;
  validation: Validation;
  inputMode?: 'search' | 'text' | 'none' | 'tel' | 'numeric' | 'url' | 'email' | 'decimal';
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}
export const TextFieldWithValidation = ({
  label,
  value,
  name,
  className,
  validation,
  inputMode = 'text',
  onChange
}: TextFieldWithValidationProps): JSX.Element => {
  const { validationError, validate } = useValidation(validation);
  const errorMessageId = useId();

  const validateOnBlur = (event: React.FocusEvent<HTMLInputElement>): void => {
    if (!event.target.value) {
      validate(event.target.value);
    }
  };

  const handleOnTextFieldChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    validate(event.target.value);
    onChange(event);
  };

  const textFieldLabel = `${label} ${validation?.required ? '*' : ''}`;
  const isRequired = !!validation?.required;

  return (
    <>
      <TextField
        value={value}
        name={name}
        className={className}
        inputMode={inputMode}
        label={textFieldLabel}
        onBlur={validateOnBlur}
        onChange={handleOnTextFieldChange}
        aria-errormessage={errorMessageId}
        aria-invalid={!!validationError}
        aria-required={isRequired}
        required={isRequired}
      />
      <div className={classes.errorMessageContainer}>
        {validationError ? (
          <ErrorMessage id={errorMessageId}>
            <p className={classes.errorMessageText}>{validationError}</p>
          </ErrorMessage>
        ) : null}
      </div>
    </>
  );
};
