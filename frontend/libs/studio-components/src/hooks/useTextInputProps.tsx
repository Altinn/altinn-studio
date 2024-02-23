import React, { useEffect, useState, type ChangeEvent, type FocusEvent } from 'react';
import type { AdditionalProps, SharedTextInputProps } from '../types/SharedTextInputProps';
import { StudioLabelWrapper } from '../components/StudioLabelWrapper';

type ElementType = HTMLInputElement | HTMLTextAreaElement;

export function useTextInputProps<E extends ElementType>(
  props: SharedTextInputProps<E>,
): Omit<SharedTextInputProps<E>, keyof AdditionalProps> {
  const {
    value = '',
    onChange,
    onBlur,
    error,
    errorAfterBlur,
    label,
    withAsterisk,
    ...rest
  } = props;

  const [valueState, setValueState] = useState(value);
  const [showError, setShowError] = useState(false);

  const disableError = () => setShowError(false);
  const enableError = () => setShowError(true);

  useEffect(() => {
    if (!value) disableError();
    setValueState(value);
  }, [value]);

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
  } as Omit<SharedTextInputProps<E>, keyof AdditionalProps>;
}
