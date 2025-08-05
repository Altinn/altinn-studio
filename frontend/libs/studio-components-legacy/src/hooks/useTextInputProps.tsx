import type { ChangeEvent, FocusEvent } from 'react';
import React, { useEffect, useState } from 'react';
import type { AdditionalProps, SharedTextInputProps } from '../types/SharedTextInputProps';
import { StudioLabelWrapper } from '../components';

type ElementType = HTMLInputElement | HTMLTextAreaElement;

/**
 * @deprecated - Not needed when using the new `StudioTextfield` component.
 */
export function useTextInputProps<E extends ElementType>(
  props: SharedTextInputProps<E>,
): Omit<SharedTextInputProps<E>, keyof AdditionalProps> {
  const {
    value,
    defaultValue,
    onChange,
    onBlur,
    error,
    errorAfterBlur,
    label,
    withAsterisk,
    size = 'sm',
    ...rest
  } = props;

  const initialValue = value ?? defaultValue ?? '';
  const [valueState, setValueState] = useState(initialValue);
  const [showError, setShowError] = useState(false);

  const disableError = () => setShowError(false);
  const enableError = () => setShowError(true);

  useEffect(() => {
    if (!initialValue) disableError();
    setValueState(initialValue);
  }, [initialValue]);

  const handleChange = (event: ChangeEvent<E>) => {
    setValueState(event.target.value);
    if (!event.target.value) disableError();
    onChange?.(event);
  };

  const handleBlur = (event: FocusEvent<E>) => {
    if (event.target.value) enableError();
    onBlur?.(event);
  };

  const errorComponent = showError && errorAfterBlur ? errorAfterBlur : error;
  const labelComponent = (
    <StudioLabelWrapper withAsterisk={withAsterisk}>{label}</StudioLabelWrapper>
  );

  return {
    ...rest,
    value: valueState,
    onChange: handleChange,
    onBlur: handleBlur,
    error: errorComponent,
    label: labelComponent,
    size,
  } as Omit<SharedTextInputProps<E>, keyof AdditionalProps>;
}
