import React from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

import { Paragraph, Textfield } from '@digdir/designsystemet-react';
import type { FieldCounterProps } from '@digdir/designsystemet-react';

import { useTranslation } from 'src/app-components/AppComponentsProvider';
import classes from 'src/app-components/Input/Input.module.css';
import type { InputType } from 'src/app-components/Input/constants';

/**
 * Hook to create a character limit object for use in input components
 */
export const useCharacterLimit = (maxLength: number | undefined): FieldCounterProps | undefined => {
  const t = useTranslation();

  if (maxLength === undefined) {
    return undefined;
  }

  return {
    limit: maxLength,
    under: t('input.remaining_characters'),
    over: t('input.exceeded_max_limit'),
  };
};

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
  const {
    size = 'sm',
    readOnly,
    error,
    textonly,
    maxLength,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    label,
    prefix,
    suffix,
    placeholder,
    ...rest
  } = props;

  const characterLimit = useCharacterLimit(maxLength);
  const t = useTranslation();

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
    ? { 'aria-label': t(ariaLabel) }
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
      prefix={prefix ? t(prefix) : undefined}
      suffix={suffix ? t(suffix) : undefined}
      placeholder={placeholder ? t(placeholder) : undefined}
      {...labelProps}
      {...rest}
    />
  );
}
