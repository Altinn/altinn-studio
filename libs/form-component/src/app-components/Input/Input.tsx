import React from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

import {
  Paragraph,
  Textfield,
  type TextfieldProps,
  type FieldCounterProps,
} from '@digdir/designsystemet-react';

import classes from './Input.module.css';

type LabelRequired =
  | { 'aria-label': string; 'aria-labelledby'?: never; label?: never }
  | { 'aria-label'?: never; 'aria-labelledby'?: never; label: ReactNode }
  | { 'aria-label'?: never; 'aria-labelledby': string; label?: never };

export type InputProps = {
  size?: 'sm' | 'md' | 'lg';
  prefix?: string;
  suffix?: string;
  error?: ReactNode;
  disabled?: boolean;
  id?: string;
  readOnly?: boolean;
  type?: TextfieldProps['type'];
  textonly?: boolean;
  characterLimit?: FieldCounterProps;
  placeholder?: string;
} & Pick<
  InputHTMLAttributes<HTMLInputElement>,
  | 'value'
  | 'className'
  | 'aria-describedby'
  | 'onChange'
  | 'autoComplete'
  | 'required'
  | 'onBlur'
  | 'inputMode'
  | 'style'
  | 'pattern'
  | 'onKeyDown'
> &
  LabelRequired;

export function Input(props: InputProps) {
  const {
    size = 'sm',
    readOnly,
    error,
    textonly,
    characterLimit,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    label,
    prefix,
    suffix,
    placeholder,
    ...rest
  } = props;

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    if (readOnly) {
      event.preventDefault();
    }
  };

  if (textonly) {
    const { value, id, className } = props;
    if (value === null || (typeof value === 'string' && value.length === 0)) {
      return null;
    }

    return (
      <Paragraph
        id={id}
        data-size={size}
        className={`${classes.textPadding} ${classes.focusable} ${className}`}
        tabIndex={0}
      >
        {value}
      </Paragraph>
    );
  }

  const labelProps = ariaLabel
    ? { 'aria-label': ariaLabel }
    : ariaLabelledBy
      ? { 'aria-labelledby': ariaLabelledBy }
      : { label };

  return (
    <Textfield
      data-size={size}
      onPaste={handlePaste}
      aria-invalid={!!error}
      readOnly={readOnly}
      counter={!readOnly ? characterLimit : undefined}
      prefix={prefix}
      suffix={suffix}
      placeholder={placeholder}
      {...labelProps}
      {...rest}
    />
  );
}
