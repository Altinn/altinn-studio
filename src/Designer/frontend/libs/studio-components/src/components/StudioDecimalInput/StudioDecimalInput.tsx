import React, { forwardRef, useCallback, useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FocusEvent, ReactElement, Ref } from 'react';
import { convertNumberToString, convertStringToNumber, isStringValidDecimalNumber } from './utils';
import { StudioTextfield } from '../StudioTextfield';
import type { StudioTextfieldProps } from '../StudioTextfield';

export type StudioDecimalInputProps = StudioTextfieldProps & {
  onChangeNumber?: (value: number | null) => void;
  onBlurNumber?: (value: number | null) => void;
  value?: number;
  validationErrorMessage?: string;
};

function StudioDecimalInput(
  {
    onBlur,
    onBlurNumber,
    onChange,
    onChangeNumber,
    value,
    validationErrorMessage,
    required,
    ...rest
  }: StudioDecimalInputProps,
  ref: Ref<HTMLInputElement>,
): ReactElement {
  const [inputValue, setInputValue] = useState('');

  useEffect((): void => {
    const newInputValue = convertNumberToString(value);
    setInputValue(newInputValue);
  }, [value]);

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement> & ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      setInputValue(input);
      if (isStringValidDecimalNumber(input)) {
        onChangeNumber?.(convertStringToNumber(input));
      }
      onChange?.(e);
    },
    [onChange, onChangeNumber, setInputValue],
  );

  const handleInputBlur = useCallback(
    (e: FocusEvent<HTMLTextAreaElement> & FocusEvent<HTMLInputElement>) => {
      const input = e.target.value;
      if (isStringValidDecimalNumber(input)) {
        onBlurNumber?.(convertStringToNumber(input));
      }
      onBlur?.(e);
    },
    [onBlur, onBlurNumber],
  );

  const errorMessage = useMemo(
    () => (!isStringValidDecimalNumber(inputValue) ? validationErrorMessage : undefined),
    [inputValue, validationErrorMessage],
  );

  return (
    <StudioTextfield
      error={errorMessage}
      onBlur={handleInputBlur}
      onChange={handleInputChange}
      inputMode='decimal'
      value={inputValue}
      ref={ref}
      {...rest}
    />
  );
}

const ForwardedStudioDecimalInput = forwardRef(StudioDecimalInput);

export { ForwardedStudioDecimalInput as StudioDecimalInput };
