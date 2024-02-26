import type { RefObject } from 'react';
import React, { forwardRef, useCallback, useEffect, useMemo, useState } from 'react';
import { convertNumberToString, convertStringToNumber, isStringValidDecimalNumber } from './utils';
import type { StudioTextfieldProps } from '../StudioTextfield';
import { StudioTextfield } from '../StudioTextfield';

export interface StudioDecimalInputProps extends Omit<StudioTextfieldProps, 'onChange'> {
  description: string;
  onChange: (value: number) => void;
  value?: number;
  validationErrorMessage: string;
}

export const StudioDecimalInput = forwardRef(
  (
    { description, onChange, value, validationErrorMessage, ...rest }: StudioDecimalInputProps,
    ref: RefObject<HTMLInputElement>,
  ) => {
    const [inputValue, setInputValue] = useState('');

    useEffect(() => {
      const newInputValue = convertNumberToString(value);
      setInputValue(newInputValue);
    }, [value]);

    const handleInputChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target.value;
        setInputValue(input);
        if (isStringValidDecimalNumber(input)) onChange(convertStringToNumber(input));
      },
      [setInputValue, onChange],
    );

    const errorMessage = useMemo(
      () => (!isStringValidDecimalNumber(inputValue) ? validationErrorMessage : undefined),
      [inputValue, validationErrorMessage],
    );

    return (
      <StudioTextfield
        description={description}
        value={inputValue}
        onChange={handleInputChange}
        errorAfterBlur={errorMessage}
        inputMode='decimal'
        ref={ref}
        {...rest}
      />
    );
  },
);

StudioDecimalInput.displayName = 'StudioDecimalInput';
