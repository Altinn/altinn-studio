import React from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

import { Paragraph, Textfield } from '@digdir/designsystemet-react';
import type { FieldCounterProps } from '@digdir/designsystemet-react';

import { useTranslation } from 'src/app-components/AppComponentsProvider';
import classes from 'src/app-components/Input/Input.module.css';
import type { InputType } from 'src/app-components/Input/constants';
import type { TranslationKey } from 'src/app-components/types';

/**
 * Hook to create a character limit object for use in input components
 */
export const useCharacterLimit = (maxLength: number | undefined): FieldCounterProps | undefined => {
  const { translate } = useTranslation();

  if (maxLength === undefined) {
    return undefined;
  }

  return {
    limit: maxLength,
    under: translate('input_components.remaining_characters'),
    over: translate('input_components.exceeded_max_limit'),
  };
};

type LabelRequired =
  | { 'aria-label': TranslationKey; 'aria-labelledby'?: never; label?: never }
  | { 'aria-label'?: never; 'aria-labelledby'?: never; label: ReactNode }
  | { 'aria-label'?: never; 'aria-labelledby': string; label?: never };

export type InputProps = {
  size?: 'sm' | 'md' | 'lg';
  prefix?: TranslationKey;
  suffix?: TranslationKey;
  error?: ReactNode;
  disabled?: boolean;
  id?: string;
  readOnly?: boolean;
  type?: InputType;
  textonly?: boolean;
  maxLength?: number;
  placeholder?: TranslationKey;
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
  const { translate } = useTranslation();

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
    ? { 'aria-label': translate(ariaLabel) }
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
      prefix={prefix ? translate(prefix) : undefined}
      suffix={suffix ? translate(suffix) : undefined}
      placeholder={placeholder ? translate(placeholder) : undefined}
      {...labelProps}
      {...rest}
    />
  );
}
