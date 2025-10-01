import React from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

import { Paragraph, Textfield } from '@digdir/designsystemet-react';

import classes from 'src/app-components/Input/Input.module.css';
import { useCharacterLimit } from 'src/utils/inputUtils';
import type { InputType } from 'src/app-components/Input/constants';

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
  type?: InputType;
  textonly?: boolean;
  maxLength?: number;
} & Pick<
  InputHTMLAttributes<HTMLInputElement>,
  | 'value'
  | 'className'
  | 'aria-label'
  | 'aria-describedby'
  | 'onChange'
  | 'autoComplete'
  | 'required'
  | 'onBlur'
  | 'placeholder'
  | 'inputMode'
  | 'style'
  | 'pattern'
  | 'onKeyDown'
> &
  LabelRequired;

export function Input(props: InputProps) {
  const { size = 'sm', readOnly, error, textonly, maxLength, ...rest } = props;

  const characterLimit = useCharacterLimit(maxLength);

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

  return (
    <Textfield
      data-size={size}
      onPaste={handlePaste}
      aria-invalid={!!error}
      readOnly={readOnly}
      counter={!readOnly ? characterLimit : undefined}
      {...rest}
    />
  );
}
