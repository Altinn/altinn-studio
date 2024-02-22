import type { RefObject } from 'react';
import React, { forwardRef, useCallback, useEffect, useMemo, useState } from 'react';
import type { TextfieldProps } from '@digdir/design-system-react';
import { Textfield } from '@digdir/design-system-react';
import { convertNumberToString, convertStringToNumber, isStringValidDecimalNumber } from './utils';

export interface StudioDecimalInputProps extends Omit<TextfieldProps, 'onChange'> {
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
    const [hasBeenBlurred, setHasBeenBlurred] = useState(false);
    const isEmpty = inputValue === '';

    useEffect(() => {
      const newInputValue = convertNumberToString(value);
      setInputValue(newInputValue);
    }, [value]);

    const handleInputChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target.value;
        setInputValue(input);
        if (isEmpty) setHasBeenBlurred(false);
        if (isStringValidDecimalNumber(input)) onChange(convertStringToNumber(input));
      },
      [setInputValue, onChange, isEmpty, setHasBeenBlurred],
    );

    const errorMessage = useMemo(() => {
      const showErrorMessage =
        hasBeenBlurred && !isEmpty && !isStringValidDecimalNumber(inputValue);
      return showErrorMessage ? validationErrorMessage : undefined;
    }, [hasBeenBlurred, isEmpty, inputValue, validationErrorMessage]);

    return (
      <Textfield
        description={description}
        value={inputValue}
        onChange={handleInputChange}
        error={errorMessage}
        onBlur={() => setHasBeenBlurred(true)}
        inputMode='decimal'
        ref={ref}
        {...rest}
      />
    );
  },
);

StudioDecimalInput.displayName = 'StudioDecimalInput';
