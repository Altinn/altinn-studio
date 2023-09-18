import React, { ReactNode } from 'react';
import classes from './InputField.module.css';
import { ErrorMessage, Label, Paragraph, TextArea, TextField } from '@digdir/design-system-react';

export type InputFieldProps = {
  id: string;
  label: string;
  description: string;
  value: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  isValid?: boolean;
  errorText?: string;
  type: 'textfield' | 'textarea';
  readOnly?: boolean;
};

export const InputField = ({
  id,
  label,
  description,
  value,
  onChange,
  onBlur,
  isValid,
  errorText,
  type,
  readOnly,
}: InputFieldProps): ReactNode => {
  const displayInputField = () => {
    switch (type) {
      case 'textfield': {
        return (
          <TextField
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            isValid={isValid}
            readOnly={readOnly}
          />
        );
      }
      case 'textarea': {
        return (
          <TextArea
            id={id}
            value={value}
            onChange={(e) => onChange(e.currentTarget.value)}
            onBlur={onBlur}
            resize='vertical'
            rows={5}
            isValid={isValid}
            readOnly={readOnly}
          />
        );
      }
    }
  };
  return (
    <div className={classes.wrapper}>
      <Label htmlFor={id}>{label}</Label>
      <Paragraph>{description}</Paragraph>
      {displayInputField()}
      {!isValid && <ErrorMessage>{errorText}</ErrorMessage>}
    </div>
  );
};
